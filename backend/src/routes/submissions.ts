import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { getDatabase } from '@/database/connection';
import { authenticateToken, requirePhoneVerification, AuthenticatedRequest } from '@/middleware/authMiddleware';

const router = Router();

// Create new NPD submission
router.post('/', [
  authenticateToken,
  requirePhoneVerification,
  body('product_name').isLength({ min: 2 }).withMessage('Product name is required'),
  body('brand').isLength({ min: 2 }).withMessage('Brand is required'),
  body('category').optional().isString(),
  body('store_name').optional().isString(),
  body('store_type').optional().isString(),
  body('purchase_price').optional().isNumeric(),
  body('purchase_date').optional().isISO8601(),
  body('submission_location').optional().isObject()
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      product_name,
      brand,
      category,
      store_name,
      store_type,
      purchase_price,
      purchase_date,
      submission_location,
      raw_submission_data
    } = req.body;

    const db = getDatabase();

    // Check for potential duplicates
    const duplicateCheck = await db.query(
      `SELECT id FROM npd_submissions 
       WHERE user_id = $1 
       AND submitted_product_name ILIKE $2 
       AND submitted_brand ILIKE $3 
       AND created_at > NOW() - INTERVAL '24 hours'`,
      [req.user!.id, product_name, brand]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Similar submission already exists within 24 hours'
      });
    }

    // Create submission
    const result = await db.query(
      `INSERT INTO npd_submissions (
        user_id, submitted_product_name, submitted_brand, submitted_category,
        store_name, store_type, purchase_price, purchase_date,
        submission_location, raw_submission_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, status, base_reward, created_at`,
      [
        req.user!.id,
        product_name,
        brand,
        category || null,
        store_name || null,
        store_type || null,
        purchase_price || null,
        purchase_date || null,
        submission_location ? JSON.stringify(submission_location) : null,
        raw_submission_data ? JSON.stringify(raw_submission_data) : null
      ]
    );

    const submission = result.rows[0];

    // Update user submission count
    await db.query(
      'UPDATE users SET total_submissions = total_submissions + 1 WHERE id = $1',
      [req.user!.id]
    );

    res.status(201).json({
      success: true,
      data: {
        submission: {
          id: submission.id,
          status: submission.status,
          base_reward: submission.base_reward,
          created_at: submission.created_at
        }
      }
    });

  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create submission'
    });
  }
});

// Get user's submissions
router.get('/my-submissions', [
  authenticateToken
], async (req: AuthenticatedRequest, res) => {
  try {
    const { page = '1', limit = '20', status } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const db = getDatabase();

    let whereClause = 'WHERE user_id = $1';
    let params: any[] = [req.user!.id];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const query = `
      SELECT 
        id, submitted_product_name, submitted_brand, submitted_category,
        status, ai_confidence_score, base_reward, bonus_reward, total_reward,
        reward_status, store_name, purchase_price, created_at, reviewed_at
      FROM npd_submissions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM npd_submissions
      ${whereClause}
    `;

    const [submissions, countResult] = await Promise.all([
      db.query(query, [...params, parseInt(limit as string), offset]),
      db.query(countQuery, params)
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / parseInt(limit as string));

    res.json({
      success: true,
      data: {
        submissions: submissions.rows,
        pagination: {
          currentPage: parseInt(page as string),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit as string),
          hasNextPage: parseInt(page as string) < totalPages,
          hasPreviousPage: parseInt(page as string) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get submissions'
    });
  }
});

// Get submission details
router.get('/:id', [
  authenticateToken
], async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const result = await db.query(
      `SELECT 
        s.*,
        u.full_name as reviewer_name,
        p.name as matched_product_name,
        p.brand as matched_product_brand
      FROM npd_submissions s
      LEFT JOIN users u ON s.reviewed_by = u.id
      LEFT JOIN products p ON s.product_id = p.id
      WHERE s.id = $1 AND s.user_id = $2`,
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }

    // Get associated images
    const imagesResult = await db.query(
      'SELECT id, image_url, image_type, quality_score FROM product_images WHERE submission_id = $1',
      [id]
    );

    const submission = result.rows[0];
    submission.images = imagesResult.rows;

    res.json({
      success: true,
      data: { submission }
    });

  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get submission'
    });
  }
});

// Upload images for submission
router.post('/:id/images', [
  authenticateToken,
  body('image_type').isIn(['front', 'back', 'ingredients', 'nutrition', 'packaging', 'receipt', 'other']),
  body('image_url').isURL()
], async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { image_type, image_url, file_size, dimensions } = req.body;
    const db = getDatabase();

    // Verify submission belongs to user
    const submissionCheck = await db.query(
      'SELECT id FROM npd_submissions WHERE id = $1 AND user_id = $2',
      [id, req.user!.id]
    );

    if (submissionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }

    // Add image
    const result = await db.query(
      `INSERT INTO product_images (submission_id, image_url, image_type, file_size, dimensions, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, image_url, image_type, created_at`,
      [id, image_url, image_type, file_size || null, dimensions || null, req.user!.id]
    );

    res.status(201).json({
      success: true,
      data: { image: result.rows[0] }
    });

  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image'
    });
  }
});

// Get submission statistics for user
router.get('/stats/summary', [
  authenticateToken
], async (req: AuthenticatedRequest, res) => {
  try {
    const db = getDatabase();

    const result = await db.query(
      `SELECT 
        COUNT(*) as total_submissions,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_submissions,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_submissions,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_submissions,
        COALESCE(SUM(CASE WHEN reward_status = 'paid' THEN total_reward ELSE 0 END), 0) as total_earnings,
        COALESCE(AVG(ai_confidence_score), 0) as avg_confidence_score
      FROM npd_submissions
      WHERE user_id = $1`,
      [req.user!.id]
    );

    const stats = result.rows[0];

    // Calculate approval rate
    const approvalRate = stats.total_submissions > 0 
      ? (stats.approved_submissions / stats.total_submissions * 100).toFixed(1)
      : '0.0';

    res.json({
      success: true,
      data: {
        stats: {
          ...stats,
          approval_rate: parseFloat(approvalRate),
          total_earnings: parseFloat(stats.total_earnings),
          avg_confidence_score: parseFloat(stats.avg_confidence_score)
        }
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

export default router;