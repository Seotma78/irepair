import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb } from '../db';
import { AuthenticatedRequest, authenticateToken, logActivity } from '../middleware/auth';
import { sendJobApplicationEmail } from '../services/emailService';

export const jobsRouter = Router();
export const adminJobsRouter = Router();

// Directory for resume and cover letter file uploads
const CAREER_UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads', 'careers');
if (!fs.existsSync(CAREER_UPLOADS_DIR)) {
  fs.mkdirSync(CAREER_UPLOADS_DIR, { recursive: true });
}

// Multer storage engine
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, CAREER_UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const cleanBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
    const unique = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    cb(null, `${cleanBase}_${unique}${ext}`);
  },
});

// Multer upload middleware
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.rtf', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/rtf',
      'text/plain',
    ];

    if (allowedExtensions.includes(ext) || allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are accepted.'));
    }
  },
});

/* =========================================================
   PUBLIC ROUTES: /api/jobs
   ========================================================= */

// GET /api/jobs - List all active jobs
jobsRouter.get('/', async (_req: Request, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const jobs = db.all(
      `SELECT * FROM jobs WHERE status = 'Active' ORDER BY created_at DESC`
    );
    return res.json(jobs);
  } catch (err: any) {
    console.error('Failed to fetch jobs:', err);
    return res.status(500).json({ error: 'Failed to retrieve job openings' });
  }
});

// GET /api/jobs/:id - Get a specific job by ID
jobsRouter.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const job = db.get('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
    if (!job) {
      return res.status(404).json({ error: 'Job opening not found' });
    }
    return res.json(job);
  } catch (err: any) {
    console.error('Failed to fetch job:', err);
    return res.status(500).json({ error: 'Failed to retrieve job details' });
  }
});

// POST /api/jobs/apply - Submit job application with resume & cover letter
jobsRouter.post(
  '/apply',
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 },
  ]),
  async (req: Request, res: Response): Promise<any> => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const {
        jobId,
        fullName,
        email,
        phone,
        educationLevel,
        salaryExpectations,
        notes,
      } = req.body;

      // Validation
      if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
        return res.status(400).json({ error: 'Full name is required.' });
      }

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email address is required.' });
      }

      if (!phone || typeof phone !== 'string' || !phone.trim()) {
        return res.status(400).json({ error: 'Phone number is required.' });
      }

      if (!educationLevel || typeof educationLevel !== 'string' || !educationLevel.trim()) {
        return res.status(400).json({ error: 'Education level is required.' });
      }

      const salaryNum = Number(salaryExpectations);
      if (isNaN(salaryNum) || salaryNum <= 0) {
        return res.status(400).json({ error: 'Please enter a valid salary expectation in GBP.' });
      }

      const resumeFile = files && files['resume'] ? files['resume'][0] : null;
      if (!resumeFile) {
        return res.status(400).json({ error: 'Resume file (PDF, DOC, or DOCX) is required.' });
      }

      const coverLetterFile = files && files['coverLetter'] ? files['coverLetter'][0] : null;

      const db = await getDb();

      // Verify job exists
      const job = db.get<{ id: string; title: string; location: string; status: string }>(
        'SELECT id, title, location, status FROM jobs WHERE id = ?',
        [jobId]
      );

      if (!job) {
        return res.status(404).json({ error: 'The selected job opening was not found or is closed.' });
      }

      const applicationId = `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      // URLs for client downloads
      const resumeUrl = `/uploads/careers/${resumeFile.filename}`;
      const coverLetterUrl = coverLetterFile ? `/uploads/careers/${coverLetterFile.filename}` : null;

      // Insert record
      db.run(
        `INSERT INTO job_applications (
          id, job_id, full_name, email, phone, education_level, salary_expectations,
          resume_url, resume_filename, cover_letter_url, cover_letter_filename,
          status, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          applicationId,
          job.id,
          fullName.trim(),
          email.trim().toLowerCase(),
          phone.trim(),
          educationLevel.trim(),
          salaryNum,
          resumeUrl,
          resumeFile.originalname,
          coverLetterUrl,
          coverLetterFile ? coverLetterFile.originalname : null,
          'new',
          notes ? String(notes).trim() : null,
          now,
        ]
      );

      // Prepare file attachments for outgoing email
      const emailAttachments: { filename: string; path: string; contentType?: string }[] = [
        {
          filename: resumeFile.originalname,
          path: resumeFile.path,
          contentType: resumeFile.mimetype,
        },
      ];

      if (coverLetterFile) {
        emailAttachments.push({
          filename: coverLetterFile.originalname,
          path: coverLetterFile.path,
          contentType: coverLetterFile.mimetype,
        });
      }

      // Send automated notification email to info@irepair-mobiles.co.uk
      const emailResult = await sendJobApplicationEmail({
        candidateName: fullName.trim(),
        candidateEmail: email.trim().toLowerCase(),
        candidatePhone: phone.trim(),
        educationLevel: educationLevel.trim(),
        salaryExpectations: salaryNum,
        jobTitle: job.title,
        jobLocation: job.location,
        applicationId,
        submittedAt: new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' }),
        attachments: emailAttachments,
      });

      return res.status(201).json({
        success: true,
        message: 'Your job application has been submitted successfully! Our hiring team will review your application shortly.',
        applicationId,
        emailSent: emailResult.emailSent,
        jobTitle: job.title,
        candidateName: fullName.trim(),
      });
    } catch (err: any) {
      console.error('Job application submission error:', err);
      return res.status(500).json({ error: err.message || 'Failed to submit application. Please try again.' });
    }
  }
);

/* =========================================================
   ADMIN ROUTES: /api/admin/jobs (Requires authentication)
   ========================================================= */
adminJobsRouter.use(authenticateToken);

// GET /api/admin/jobs - List all jobs with application count
adminJobsRouter.get('/', async (_req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const rows = db.all(`
      SELECT j.*, 
             COUNT(a.id) as applicants_count
      FROM jobs j
      LEFT JOIN job_applications a ON a.job_id = j.id
      GROUP BY j.id
      ORDER BY j.created_at DESC
    `);
    return res.json(rows);
  } catch (err: any) {
    console.error('Failed to fetch admin jobs:', err);
    return res.status(500).json({ error: 'Failed to retrieve jobs list' });
  }
});

// GET /api/admin/jobs/applications - List all job applications
adminJobsRouter.get('/applications', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const { jobId, status } = req.query;

    let sql = `
      SELECT a.*, 
             j.title as job_title, 
             j.location as job_location
      FROM job_applications a
      JOIN jobs j ON j.id = a.job_id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (jobId && typeof jobId === 'string') {
      conditions.push('a.job_id = ?');
      params.push(jobId);
    }

    if (status && typeof status === 'string') {
      conditions.push('a.status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY a.created_at DESC';

    const applications = db.all(sql, params);
    return res.json(applications);
  } catch (err: any) {
    console.error('Failed to fetch applications:', err);
    return res.status(500).json({ error: 'Failed to retrieve applications' });
  }
});

// POST /api/admin/jobs - Create a new job opening
adminJobsRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const {
      title,
      location,
      vacancies,
      closing_date,
      description,
      status = 'Active',
      department = 'Retail & Customer Experience',
      salary_range = 'Competitive',
      employment_type = 'Full-Time',
    } = req.body;

    if (!title || !location) {
      return res.status(400).json({ error: 'Job title and location are required.' });
    }

    const db = await getDb();
    const now = new Date().toISOString();
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    db.run(
      `INSERT INTO jobs (
        id, title, location, vacancies, closing_date, description, status,
        department, salary_range, employment_type, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        String(title).trim(),
        String(location).trim(),
        Number(vacancies) || 1,
        closing_date || null,
        description ? String(description).trim() : '<p>Job description coming soon.</p>',
        status === 'Closed' ? 'Closed' : 'Active',
        String(department || 'Retail & Customer Experience').trim(),
        String(salary_range || 'Competitive').trim(),
        String(employment_type || 'Full-Time').trim(),
        now,
        now,
      ]
    );

    if (req.user) {
      logActivity(req.user.email, 'CREATE_JOB', { id, title });
    }

    const created = db.get('SELECT * FROM jobs WHERE id = ?', [id]);
    return res.status(201).json(created);
  } catch (err: any) {
    console.error('Failed to create job:', err);
    return res.status(500).json({ error: 'Failed to create job opening' });
  }
});

// PUT /api/admin/jobs/:id - Update existing job opening
adminJobsRouter.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const {
      title,
      location,
      vacancies,
      closing_date,
      description,
      status,
      department,
      salary_range,
      employment_type,
    } = req.body;

    const db = await getDb();
    const existing = db.get('SELECT * FROM jobs WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Job opening not found' });
    }

    const now = new Date().toISOString();

    db.run(
      `UPDATE jobs SET
        title = ?,
        location = ?,
        vacancies = ?,
        closing_date = ?,
        description = ?,
        status = ?,
        department = ?,
        salary_range = ?,
        employment_type = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        title ? String(title).trim() : (existing as any).title,
        location ? String(location).trim() : (existing as any).location,
        vacancies !== undefined ? Number(vacancies) : (existing as any).vacancies,
        closing_date !== undefined ? closing_date : (existing as any).closing_date,
        description !== undefined ? String(description).trim() : (existing as any).description,
        status !== undefined ? (status === 'Closed' ? 'Closed' : 'Active') : (existing as any).status,
        department !== undefined ? String(department).trim() : (existing as any).department,
        salary_range !== undefined ? String(salary_range).trim() : (existing as any).salary_range,
        employment_type !== undefined ? String(employment_type).trim() : (existing as any).employment_type,
        now,
        id,
      ]
    );

    if (req.user) {
      logActivity(req.user.email, 'UPDATE_JOB', { id, title });
    }

    const updated = db.get('SELECT * FROM jobs WHERE id = ?', [id]);
    return res.json(updated);
  } catch (err: any) {
    console.error('Failed to update job:', err);
    return res.status(500).json({ error: 'Failed to update job opening' });
  }
});

// DELETE /api/admin/jobs/:id - Delete job opening and associated applications
adminJobsRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const existing = db.get<{ title: string }>('SELECT title FROM jobs WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Job opening not found' });
    }

    db.run('DELETE FROM job_applications WHERE job_id = ?', [id]);
    db.run('DELETE FROM jobs WHERE id = ?', [id]);

    if (req.user) {
      logActivity(req.user.email, 'DELETE_JOB', { id, title: existing.title });
    }

    return res.json({ success: true, message: 'Job opening and applications deleted successfully.' });
  } catch (err: any) {
    console.error('Failed to delete job:', err);
    return res.status(500).json({ error: 'Failed to delete job opening' });
  }
});

// PUT /api/admin/jobs/applications/:id/status - Update application review status
adminJobsRouter.put('/applications/:id/status', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const allowed = ['new', 'reviewed', 'shortlisted', 'interviewing', 'rejected', 'hired'];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${allowed.join(', ')}` });
    }

    const db = await getDb();
    const existing = db.get('SELECT * FROM job_applications WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Job application not found' });
    }

    if (notes !== undefined) {
      db.run('UPDATE job_applications SET status = ?, notes = ? WHERE id = ?', [status || (existing as any).status, notes, id]);
    } else {
      db.run('UPDATE job_applications SET status = ? WHERE id = ?', [status, id]);
    }

    return res.json({ success: true, message: 'Application status updated' });
  } catch (err: any) {
    console.error('Failed to update application status:', err);
    return res.status(500).json({ error: 'Failed to update application' });
  }
});

// DELETE /api/admin/jobs/applications/:id - Delete an application
adminJobsRouter.delete('/applications/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const existing = db.get<{ resume_url: string; cover_letter_url: string }>('SELECT resume_url, cover_letter_url FROM job_applications WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Try to remove files from disk if they exist in public/uploads/careers
    try {
      if (existing.resume_url && existing.resume_url.startsWith('/uploads/careers/')) {
        const filePath = path.join(process.cwd(), 'public', existing.resume_url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      if (existing.cover_letter_url && existing.cover_letter_url.startsWith('/uploads/careers/')) {
        const filePath = path.join(process.cwd(), 'public', existing.cover_letter_url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    } catch (fileErr) {
      console.warn('Could not remove file on disk:', fileErr);
    }

    db.run('DELETE FROM job_applications WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Application removed successfully' });
  } catch (err: any) {
    console.error('Failed to delete application:', err);
    return res.status(500).json({ error: 'Failed to delete application' });
  }
});
