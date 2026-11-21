import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from './PageHeader';
import { JobOpening } from '../types';
import { 
  Briefcase, 
  MapPin, 
  Users, 
  Calendar, 
  UploadCloud, 
  CheckCircle2, 
  FileText, 
  X, 
  AlertCircle, 
  ArrowLeft, 
  Phone, 
  Mail, 
  User, 
  GraduationCap, 
  PoundSterling, 
  Building2,
  Clock,
  Sparkles,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

export const ApplyNowView: React.FC = () => {
  const { setCurrentPage, selectedJobId, setSelectedJobId, showNotification } = useApp();

  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [educationLevel, setEducationLevel] = useState('Bachelor\'s Degree');
  const [salaryExpectations, setSalaryExpectations] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);

  // Drag states
  const [resumeDragActive, setResumeDragActive] = useState(false);
  const [coverDragActive, setCoverDragActive] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const resumeInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Fetch active jobs on mount
  useEffect(() => {
    fetchActiveJobs();
  }, []);

  const fetchActiveJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await fetch('/api/jobs');
      if (res.ok) {
        const data = await res.json();
        const activeJobs: JobOpening[] = Array.isArray(data) ? data : [];
        setJobs(activeJobs);

        // Pre-select job based on selectedJobId or URL query param
        let targetId = selectedJobId;
        if (!targetId && typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          targetId = params.get('jobId') || null;
        }

        if (targetId) {
          const match = activeJobs.find(j => j.id === targetId);
          if (match) {
            setSelectedJob(match);
          } else if (activeJobs.length > 0) {
            setSelectedJob(activeJobs[0]);
          }
        } else if (activeJobs.length > 0) {
          setSelectedJob(activeJobs[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load active jobs for application:', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleJobSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chosen = jobs.find(j => j.id === e.target.value);
    if (chosen) {
      setSelectedJob(chosen);
      setSelectedJobId(chosen.id);
    }
  };

  // Drag and drop handlers for Resume
  const handleResumeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setResumeDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0], 'resume');
    }
  };

  // Drag and drop handlers for Cover Letter
  const handleCoverDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setCoverDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0], 'coverLetter');
    }
  };

  const validateAndSetFile = (file: File, type: 'resume' | 'coverLetter') => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowed.includes(ext)) {
      showNotification('Please upload a PDF, DOC, or DOCX document.', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showNotification('File exceeds the 15MB size limit.', 'error');
      return;
    }

    if (type === 'resume') {
      setResumeFile(file);
    } else {
      setCoverLetterFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedJob) {
      setFormError('Please select a valid job opening.');
      return;
    }

    if (!fullName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (!phone.trim()) {
      setFormError('Please enter a contact phone number.');
      return;
    }

    if (!salaryExpectations.trim() || isNaN(Number(salaryExpectations)) || Number(salaryExpectations) <= 0) {
      setFormError('Please provide your salary expectation in GBP (e.g. 26000).');
      return;
    }

    if (!resumeFile) {
      setFormError('Please upload your Resume / CV (PDF, DOC, DOCX).');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('jobId', selectedJob.id);
      formData.append('fullName', fullName.trim());
      formData.append('email', email.trim());
      formData.append('phone', phone.trim());
      formData.append('educationLevel', educationLevel);
      formData.append('salaryExpectations', salaryExpectations.trim());
      formData.append('resume', resumeFile);

      if (coverLetterFile) {
        formData.append('coverLetter', coverLetterFile);
      }

      const res = await fetch('/api/jobs/apply', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit application.');
      }

      setSubmitSuccess({
        applicationId: data.applicationId,
        candidateName: fullName.trim(),
        jobTitle: selectedJob.title,
        jobLocation: selectedJob.location,
        email: email.trim(),
        submittedAt: new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });

      showNotification('Application submitted successfully! Confirmation email queued.', 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Submission failed:', err);
      setFormError(err.message || 'Something went wrong while submitting your application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-white text-slate-900 min-h-screen">
      
      {/* 1. ANIMATED PAGE HEADER */}
      <PageHeader 
        title="Apply Now"
        subtitle={selectedJob ? `Applying for ${selectedJob.title} (${selectedJob.location})` : 'Submit your application to join the iRepair Mobiles UK team.'}
        badge="CAREER APPLICATION"
        breadcrumbs={[
          { label: 'Home', onClick: () => setCurrentPage('home') },
          { label: 'Careers', onClick: () => setCurrentPage('career') },
          { label: 'Apply Now' }
        ]}
      />

      {/* 2. MAIN APPLICATION CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        
        {/* Back Link */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setCurrentPage('career')}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-[#DF0C88] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Job Openings</span>
          </button>
        </div>

        {/* SUCCESS CONFIRMATION STATE */}
        {submitSuccess ? (
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            
            <div className="w-20 h-20 bg-emerald-50 border-2 border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                Application Received Successfully
              </span>
              <h2 className="text-2xl sm:text-3xl font-black font-heading text-slate-900">
                Thank You, {submitSuccess.candidateName}!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                Your application for <strong className="text-slate-900">{submitSuccess.jobTitle}</strong> at our <strong className="text-slate-900">{submitSuccess.jobLocation}</strong> branch has been submitted directly to our hiring team at <span className="text-[#DF0C88] font-bold">info@irepair-mobiles.co.uk</span>.
              </p>
            </div>

            {/* Application Summary Box */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-left text-xs sm:text-sm max-w-lg mx-auto space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Application Reference:</span>
                <strong className="font-mono text-slate-900">{submitSuccess.applicationId}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Position:</span>
                <strong className="text-slate-900">{submitSuccess.jobTitle}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Location:</span>
                <strong className="text-slate-900">{submitSuccess.jobLocation}</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Submission Date:</span>
                <strong className="text-slate-900">{submitSuccess.submittedAt}</strong>
              </div>
            </div>

            {/* Next Steps */}
            <div className="p-4 bg-pink-50/60 border border-pink-200/60 rounded-2xl max-w-lg mx-auto text-xs text-slate-600 text-left space-y-1.5">
              <div className="font-bold text-[#DF0C88] flex items-center gap-1.5 text-sm">
                <Sparkles className="w-4 h-4" />
                <span>What Happens Next?</span>
              </div>
              <p>
                Our store hiring managers review applications on a rolling basis. If your profile matches our requirements, you will receive a phone or email invitation within <strong>2 to 3 business days</strong> to arrange an interview.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setCurrentPage('career')}
                className="bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold py-3 px-6 rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer"
              >
                Browse More Opportunities
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage('home')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-6 rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Return to Home
              </button>
            </div>

          </div>
        ) : (
          /* FORM AND JOB DETAILS SPLIT GRID */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* LEFT COLUMN: SELECTED JOB DETAILS */}
            <div className="lg:col-span-5 space-y-6">
              
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
                
                {/* Job Title & Location Header */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-[11px] font-bold text-[#DF0C88] bg-pink-100 px-2.5 py-0.5 rounded-full">
                      {selectedJob?.department || 'Retail & Tech'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      {selectedJob?.employment_type || selectedJob?.employmentType || 'Full-Time'}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black font-heading text-slate-900 leading-snug">
                    {selectedJob?.title || 'Select a Position'}
                  </h3>

                  <div className="mt-3 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#DF0C88] shrink-0" />
                      <span className="font-bold text-slate-900">{selectedJob?.location || 'UK Branch'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{selectedJob?.vacancies || 1} Vacancies Open</span>
                    </div>

                    {selectedJob?.salary_range && (
                      <div className="flex items-center gap-2 text-emerald-700 font-bold">
                        <span className="w-4 h-4 flex items-center justify-center font-bold text-xs shrink-0">£</span>
                        <span>{selectedJob.salary_range}</span>
                      </div>
                    )}

                    {selectedJob?.closing_date && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Closing: <strong>{new Date(selectedJob.closing_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Full Description & Requirements */}
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Job Responsibilities &amp; Requirements
                  </h4>

                  {selectedJob?.description ? (
                    <div 
                      className="text-xs text-slate-700 leading-relaxed space-y-3 prose prose-slate max-w-none prose-h3:text-xs prose-h3:font-bold prose-h3:text-slate-900 prose-ul:pl-4 prose-li:my-1 max-h-[460px] overflow-y-auto pr-2"
                      dangerouslySetInnerHTML={{ __html: selectedJob.description }}
                    />
                  ) : (
                    <p className="text-xs text-slate-500">
                      Please select an open position from the dropdown on the right to view complete responsibilities and compensation.
                    </p>
                  )}
                </div>

                {/* Company Confidence Badges */}
                <div className="pt-4 border-t border-slate-200 space-y-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Direct hire with Phone Fresh UK Limited (Registered Co. 03133908)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#DF0C88] shrink-0" />
                    <span>Fast response: candidate reviews within 48-72 hours</span>
                  </div>
                </div>

              </div>

            </div>

            {/* RIGHT COLUMN: APPLICATION FORM */}
            <div className="lg:col-span-7">
              <div className="bg-white border-2 border-slate-200/90 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-lg space-y-6">
                
                <div>
                  <h3 className="text-xl sm:text-2xl font-black font-heading text-slate-900">
                    Candidate Application Form
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Please provide accurate contact details and upload your CV/Resume. All fields marked with (*) are required.
                  </p>
                </div>

                {/* Error Banner */}
                {formError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs sm:text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong>Application Error:</strong>
                      <p className="mt-0.5">{formError}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* Field 1: Applying Job Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                      Applying Job <span className="text-[#DF0C88]">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selectedJob?.id || ''}
                        onChange={handleJobSelectChange}
                        disabled={loadingJobs}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88] focus:border-[#DF0C88] cursor-pointer shadow-xs"
                      >
                        {jobs.map((job) => (
                          <option key={job.id} value={job.id}>
                            {job.title} — {job.location} ({job.department || 'Retail'})
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Pre-selected from the career directory. Select another role if you wish to apply for a different branch.
                    </p>
                  </div>

                  {/* Field 2: Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                      Name <span className="text-[#DF0C88]">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Sarah Jenkins"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88] focus:border-[#DF0C88]"
                      />
                    </div>
                  </div>

                  {/* Field 3: Email & Field 4: Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                        Email <span className="text-[#DF0C88]">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                        <input 
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. sarah.jenkins@gmail.com"
                          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88] focus:border-[#DF0C88]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                        Phone <span className="text-[#DF0C88]">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                        <input 
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. +44 771 234 5678"
                          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88] focus:border-[#DF0C88]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Field 5: Education Level */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                      Education Level <span className="text-[#DF0C88]">*</span>
                    </label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                      <select
                        value={educationLevel}
                        onChange={(e) => setEducationLevel(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88] focus:border-[#DF0C88] cursor-pointer"
                      >
                        <option value="High School Diploma">High School Diploma</option>
                        <option value="Bachelor's Degree">Bachelor's Degree</option>
                        <option value="Master's Degree">Master's Degree</option>
                        <option value="Doctorate's Degree">Doctorate's Degree</option>
                      </select>
                    </div>
                  </div>

                  {/* Field 6: Salary Expectations (In GBP) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                      Salary Expectations (In GBP) <span className="text-[#DF0C88]">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 font-bold text-slate-400 text-sm">£</span>
                      <input 
                        type="number"
                        required
                        min="1000"
                        step="500"
                        value={salaryExpectations}
                        onChange={(e) => setSalaryExpectations(e.target.value)}
                        placeholder="e.g. 26000"
                        className="w-full pl-9 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88] focus:border-[#DF0C88]"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Annual gross salary expectation in Pounds Sterling (GBP).
                    </p>
                  </div>

                  {/* Field 7: File Upload - Resume (*) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Resume / CV <span className="text-[#DF0C88]">*</span>
                      </label>
                      <span className="text-[11px] text-slate-400">PDF, DOC, DOCX up to 15MB</span>
                    </div>

                    <input 
                      type="file"
                      ref={resumeInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          validateAndSetFile(e.target.files[0], 'resume');
                        }
                      }}
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                    />

                    {resumeFile ? (
                      <div className="bg-pink-50/60 border border-pink-200 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#DF0C88] text-white flex items-center justify-center font-bold text-xs shrink-0">
                            CV
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-xs sm:text-sm text-slate-900 truncate max-w-xs sm:max-w-md">
                              {resumeFile.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {(resumeFile.size / 1024 / 1024).toFixed(2)} MB · Ready for upload
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setResumeFile(null)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                          title="Remove File"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => { e.preventDefault(); setResumeDragActive(true); }}
                        onDragLeave={() => setResumeDragActive(false)}
                        onDrop={handleResumeDrop}
                        onClick={() => resumeInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                          resumeDragActive
                            ? 'border-[#DF0C88] bg-pink-50/80 scale-[1.01]'
                            : 'border-slate-300 hover:border-[#DF0C88] hover:bg-slate-50/60'
                        }`}
                      >
                        <UploadCloud className="w-8 h-8 text-[#DF0C88] mx-auto mb-2" />
                        <div className="text-xs sm:text-sm font-bold text-slate-800">
                          Click to browse or drag &amp; drop your Resume
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Supported formats: PDF, DOC, DOCX (Max 15MB)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Field 8: File Upload - Cover Letter (Optional) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Cover Letter <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <span className="text-[11px] text-slate-400">PDF, DOC, DOCX up to 15MB</span>
                    </div>

                    <input 
                      type="file"
                      ref={coverInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          validateAndSetFile(e.target.files[0], 'coverLetter');
                        }
                      }}
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                    />

                    {coverLetterFile ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            DOC
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-xs sm:text-sm text-slate-900 truncate max-w-xs sm:max-w-md">
                              {coverLetterFile.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {(coverLetterFile.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setCoverLetterFile(null)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                          title="Remove File"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => { e.preventDefault(); setCoverDragActive(true); }}
                        onDragLeave={() => setCoverDragActive(false)}
                        onDrop={handleCoverDrop}
                        onClick={() => coverInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                          coverDragActive
                            ? 'border-[#DF0C88] bg-pink-50/80 scale-[1.01]'
                            : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50/60'
                        }`}
                      >
                        <FileText className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                        <div className="text-xs font-semibold text-slate-700">
                          Attach a Cover Letter (Optional)
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Drag and drop or click to upload
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold py-3.5 px-6 rounded-xl text-sm sm:text-base shadow-lg shadow-pink-900/25 hover:shadow-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Uploading &amp; Submitting Application...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Application</span>
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                    
                    <p className="text-[11px] text-slate-400 text-center mt-2.5">
                      By submitting this application, you agree to our privacy policy and allow iRepair Mobiles to process your CV for recruitment purposes.
                    </p>
                  </div>

                </form>

              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
