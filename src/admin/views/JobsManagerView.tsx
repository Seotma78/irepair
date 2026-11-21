import React, { useState, useEffect } from 'react';
import { JobOpening, JobApplication } from '../../types';
import {
  Briefcase,
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Check,
  MapPin,
  Calendar,
  FileText,
  Mail,
  Phone,
  GraduationCap,
  Download,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  Filter,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export const JobsManagerView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'jobs' | 'applicants'>('jobs');
  
  // Jobs State
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobSearch, setJobSearch] = useState('');

  // Applicants State
  const [applicants, setApplicants] = useState<JobApplication[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [applicantSearch, setApplicantSearch] = useState('');
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Job Modal State (Add / Edit)
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobOpening | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    vacancies: 1,
    closing_date: '',
    description: '',
    status: 'Active' as 'Active' | 'Closed',
    department: 'Retail Sales & Customer Service',
    salary_range: '',
    employment_type: 'Full-Time',
  });

  // Delete Confirmations
  const [jobToDelete, setJobToDelete] = useState<JobOpening | null>(null);
  const [applicantToDelete, setApplicantToDelete] = useState<JobApplication | null>(null);

  // Status message
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchJobs();
    fetchApplicants();
  }, []);

  const getAuthHeader = () => {
    const token = localStorage.getItem('admin_token') || '';
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await fetch('/api/admin/jobs', {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchApplicants = async (jobId?: string) => {
    setLoadingApplicants(true);
    try {
      let url = '/api/admin/jobs/applications';
      if (jobId && jobId !== 'all') {
        url += `?jobId=${encodeURIComponent(jobId)}`;
      }
      const res = await fetch(url, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setApplicants(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch applicants:', err);
    } finally {
      setLoadingApplicants(false);
    }
  };

  const openAddJobModal = () => {
    setEditingJob(null);
    setFormData({
      title: '',
      location: 'Eastbourne, UK',
      vacancies: 1,
      closing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: `<h3>Role Overview</h3>
<p>Brief summary of this role and why it is great to work at iRepair Mobiles.</p>

<h3>Key Responsibilities</h3>
<ul>
  <li>Primary responsibility 1</li>
  <li>Primary responsibility 2</li>
  <li>Primary responsibility 3</li>
</ul>

<h3>Requirements & Skills</h3>
<ul>
  <li>Relevant experience or passion for tech</li>
  <li>Strong interpersonal skills</li>
</ul>

<h3>What We Offer</h3>
<ul>
  <li>Competitive compensation + performance bonus</li>
  <li>28 days paid holiday and staff tech discounts</li>
</ul>`,
      status: 'Active',
      department: 'Retail Sales & Customer Service',
      salary_range: '£24,000 - £28,000 / yr',
      employment_type: 'Full-Time',
    });
    setJobModalOpen(true);
  };

  const openEditJobModal = (job: JobOpening) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      location: job.location,
      vacancies: job.vacancies || 1,
      closing_date: job.closing_date ? job.closing_date.split('T')[0] : '',
      description: job.description || '',
      status: job.status || 'Active',
      department: job.department || 'Retail Sales & Customer Service',
      salary_range: job.salary_range || '',
      employment_type: job.employment_type || 'Full-Time',
    });
    setJobModalOpen(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.location.trim()) {
      setFeedback({ message: 'Title and location are required.', type: 'error' });
      return;
    }

    try {
      const url = editingJob ? `/api/admin/jobs/${editingJob.id}` : '/api/admin/jobs';
      const method = editingJob ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeader(),
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save job opening');
      }

      setFeedback({
        message: editingJob ? 'Job opening updated successfully!' : 'New job opening created successfully!',
        type: 'success',
      });
      setJobModalOpen(false);
      fetchJobs();
    } catch (err: any) {
      setFeedback({ message: err.message || 'Operation failed', type: 'error' });
    }
  };

  const handleDeleteJob = async () => {
    if (!jobToDelete) return;
    try {
      const res = await fetch(`/api/admin/jobs/${jobToDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      if (res.ok) {
        setFeedback({ message: 'Job opening deleted successfully.', type: 'success' });
        setJobToDelete(null);
        fetchJobs();
        fetchApplicants();
      } else {
        throw new Error('Failed to delete job');
      }
    } catch (err: any) {
      setFeedback({ message: err.message, type: 'error' });
    }
  };

  const handleUpdateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/jobs/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setApplicants(prev => prev.map(a => a.id === applicationId ? { ...a, status: newStatus as any } : a));
        setFeedback({ message: `Applicant status updated to ${newStatus}`, type: 'success' });
      }
    } catch (err) {
      console.error('Failed to update applicant status:', err);
    }
  };

  const handleDeleteApplicant = async () => {
    if (!applicantToDelete) return;
    try {
      const res = await fetch(`/api/admin/jobs/applications/${applicantToDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      if (res.ok) {
        setFeedback({ message: 'Application deleted successfully.', type: 'success' });
        setApplicantToDelete(null);
        fetchApplicants(selectedJobFilter);
        fetchJobs();
      }
    } catch (err: any) {
      setFeedback({ message: err.message, type: 'error' });
    }
  };

  const filteredJobs = jobs.filter(j => 
    !jobSearch.trim() ||
    j.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
    j.location.toLowerCase().includes(jobSearch.toLowerCase()) ||
    (j.department && j.department.toLowerCase().includes(jobSearch.toLowerCase()))
  );

  const filteredApplicants = applicants.filter(a => {
    const matchesJob = selectedJobFilter === 'all' || a.job_id === selectedJobFilter;
    const matchesStatus = selectedStatusFilter === 'all' || a.status === selectedStatusFilter;
    const matchesSearch = 
      !applicantSearch.trim() ||
      a.full_name.toLowerCase().includes(applicantSearch.toLowerCase()) ||
      a.email.toLowerCase().includes(applicantSearch.toLowerCase()) ||
      a.phone.includes(applicantSearch);

    return matchesJob && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-pink-50 border border-pink-200 text-[#DF0C88] flex items-center justify-center font-bold">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
                Job Openings &amp; Recruitment
              </h1>
              <p className="text-xs text-slate-500">
                Manage high-street career listings, post new job vacancies, and review candidate applications with attached CVs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'jobs' && (
            <button
              type="button"
              onClick={openAddJobModal}
              className="bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Job</span>
            </button>
          )}

          <a
            href="/career/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <span>View Public Careers (/career/)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200 ${
          feedback.type === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
        }`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'jobs'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Job Openings ({jobs.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('applicants');
            fetchApplicants(selectedJobFilter);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'applicants'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Candidate Applications ({applicants.length})</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: JOB OPENINGS                                      */}
      {/* ========================================================= */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          
          {/* Search bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                placeholder="Search jobs by title, branch, or department..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
              />
            </div>
            <div className="text-xs text-slate-500 font-semibold">
              Showing {filteredJobs.length} of {jobs.length} roles
            </div>
          </div>

          {loadingJobs ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <div className="w-8 h-8 border-4 border-[#DF0C88] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading job vacancies...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
              <Briefcase className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">No Job Openings Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No job postings currently match your query. Click "Post New Job" above to add your first vacancy.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredJobs.map((job) => (
                <div 
                  key={job.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    
                    {/* Top status & department */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        job.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {job.status}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded">
                        {job.department || 'Retail'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold font-heading text-slate-900">
                      {job.title}
                    </h3>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#DF0C88] shrink-0" />
                        <span className="font-semibold text-slate-800">{job.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{job.vacancies} Vacancy</span>
                      </div>
                      {job.salary_range && (
                        <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                          <span className="text-xs font-bold">£</span>
                          <span>{job.salary_range}</span>
                        </div>
                      )}
                      {job.closing_date && (
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Closing: {new Date(job.closing_date).toLocaleDateString('en-GB')}</span>
                        </div>
                      )}
                    </div>

                    {/* Applicants badge */}
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedJobFilter(job.id);
                          setActiveTab('applicants');
                          fetchApplicants(job.id);
                        }}
                        className="text-xs font-bold text-[#DF0C88] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>View Applicants ({job.applicants_count || 0})</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>

                  {/* Action buttons */}
                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openEditJobModal(job)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setJobToDelete(job)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: CANDIDATE APPLICATIONS                            */}
      {/* ========================================================= */}
      {activeTab === 'applicants' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            
            {/* Search */}
            <div className="sm:col-span-5 relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                value={applicantSearch}
                onChange={(e) => setApplicantSearch(e.target.value)}
                placeholder="Search candidate by name, email, or phone..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
              />
            </div>

            {/* Filter by Job */}
            <div className="sm:col-span-4">
              <select
                value={selectedJobFilter}
                onChange={(e) => {
                  setSelectedJobFilter(e.target.value);
                  fetchApplicants(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
              >
                <option value="all">All Job Vacancies</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.title} ({j.location})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div className="sm:col-span-3">
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
              >
                <option value="all">All Application Statuses</option>
                <option value="new">New Applications</option>
                <option value="reviewed">Reviewed</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interviewing">Interviewing</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

          </div>

          {loadingApplicants ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <div className="w-8 h-8 border-4 border-[#DF0C88] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading candidate submissions...</p>
            </div>
          ) : filteredApplicants.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">No Applications Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No candidates have applied for this specific role yet or your search filter yielded 0 results.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredApplicants.map((app) => (
                <div
                  key={app.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left: Candidate Info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-slate-900">
                        {app.full_name}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-semibold text-[#DF0C88]">
                        Applied for: {app.job_title} ({app.job_location})
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <a href={`mailto:${app.email}`} className="flex items-center gap-1 hover:text-[#DF0C88]">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{app.email}</span>
                      </a>
                      <a href={`tel:${app.phone}`} className="flex items-center gap-1 hover:text-[#DF0C88]">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{app.phone}</span>
                      </a>
                      <div className="flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                        <span>{app.education_level}</span>
                      </div>
                      <div className="flex items-center gap-1 font-semibold text-emerald-700">
                        <span>Expected Salary: £{Number(app.salary_expectations).toLocaleString('en-GB')} / yr</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Document Attachments */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {app.resume_url && (
                      <a
                        href={app.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-[#DF0C88] border border-pink-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                        title={app.resume_filename || 'Download Resume'}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Resume (CV)</span>
                      </a>
                    )}

                    {app.cover_letter_url && (
                      <a
                        href={app.cover_letter_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                        title={app.cover_letter_filename || 'Download Cover Letter'}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Cover Letter</span>
                      </a>
                    )}
                  </div>

                  {/* Right: Status dropdown & Delete */}
                  <div className="flex items-center gap-2 border-t lg:border-t-0 pt-3 lg:pt-0">
                    <select
                      value={app.status}
                      onChange={(e) => handleUpdateApplicationStatus(app.id, e.target.value)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border focus:outline-none cursor-pointer ${
                        app.status === 'new'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : app.status === 'shortlisted' || app.status === 'interviewing'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : app.status === 'hired'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : app.status === 'rejected'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <option value="new">New</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="interviewing">Interviewing</option>
                      <option value="hired">Hired</option>
                      <option value="rejected">Rejected</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setApplicantToDelete(app)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Delete Application"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* ADD / EDIT JOB MODAL                                     */}
      {/* ========================================================= */}
      {jobModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-heading text-white">
                  {editingJob ? 'Edit Job Opening' : 'Post New Job Opening'}
                </h3>
                <p className="text-xs text-slate-400">
                  Fill in the job requirements, branch location, and compensation details.
                </p>
              </div>
              <button 
                onClick={() => setJobModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveJob} className="p-6 overflow-y-auto space-y-4 flex-1">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Job Title *
                  </label>
                  <input 
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Female Sales Associate"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Location *
                  </label>
                  <input 
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Eastbourne, UK"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Vacancies Count
                  </label>
                  <input 
                    type="number"
                    min="1"
                    required
                    value={formData.vacancies}
                    onChange={(e) => setFormData({ ...formData, vacancies: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Closing Date
                  </label>
                  <input 
                    type="date"
                    value={formData.closing_date}
                    onChange={(e) => setFormData({ ...formData, closing_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  >
                    <option value="Active">Active (Accepting Applications)</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <input 
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Retail Sales & Customer Service"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Employment Type
                  </label>
                  <select
                    value={formData.employment_type}
                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Apprenticeship">Apprenticeship</option>
                    <option value="Temporary / Seasonal">Temporary / Seasonal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Salary Range (In GBP)
                  </label>
                  <input 
                    type="text"
                    value={formData.salary_range}
                    onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                    placeholder="e.g. £24,000 - £28,000 / yr"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  />
                </div>
              </div>

              {/* Rich Description */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Job Description &amp; Responsibilities (HTML / Rich text)
                </label>
                <textarea 
                  rows={10}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Include Role Overview, Responsibilities, Requirements, and What We Offer..."
                  className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports standard HTML tags like &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;, and &lt;li&gt;.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setJobModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold py-2.5 px-6 rounded-xl text-xs sm:text-sm shadow-md transition-colors"
                >
                  {editingJob ? 'Save Changes' : 'Publish Job Opening'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* DELETE JOB CONFIRMATION MODAL */}
      {jobToDelete && (
        <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Job Opening?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <strong>{jobToDelete.title}</strong> ({jobToDelete.location})? All associated candidate applications will also be permanently removed.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setJobToDelete(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteJob}
                className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 shadow-xs"
              >
                Yes, Delete Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE APPLICANT CONFIRMATION MODAL */}
      {applicantToDelete && (
        <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Remove Candidate Application?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Permanently delete application for <strong>{applicantToDelete.full_name}</strong>?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setApplicantToDelete(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteApplicant}
                className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 shadow-xs"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
