import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from './PageHeader';
import { JobOpening } from '../types';
import { 
  Briefcase, 
  MapPin, 
  Users, 
  Calendar, 
  ArrowRight, 
  Sparkles, 
  Award, 
  HeartHandshake, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  X,
  FileText,
  Building2,
  AlertCircle
} from 'lucide-react';

export const CareerView: React.FC = () => {
  const { setCurrentPage, setSelectedJobId } = useApp();
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');

  // Preview modal for full job description
  const [previewJob, setPreviewJob] = useState<JobOpening | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error('Failed to fetch job openings');
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      setError('Unable to load current career openings at this moment. Please check back shortly.');
    } finally {
      setLoading(false);
    }
  };

  // Distinct locations and departments
  const locations = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach(j => {
      if (j.location) set.add(j.location);
    });
    return ['All', ...Array.from(set)];
  }, [jobs]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach(j => {
      if (j.department) set.add(j.department);
    });
    return ['All', ...Array.from(set)];
  }, [jobs]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = 
        !searchQuery.trim() ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.department && job.department.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLocation = selectedLocation === 'All' || job.location === selectedLocation;
      const matchesDept = selectedDepartment === 'All' || job.department === selectedDepartment;

      return matchesSearch && matchesLocation && matchesDept;
    });
  }, [jobs, searchQuery, selectedLocation, selectedDepartment]);

  const handleApplyNow = (job: JobOpening) => {
    setSelectedJobId(job.id);
    setCurrentPage('apply-now');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full bg-white text-slate-900">
      
      {/* 1. ANIMATED PAGE HEADER */}
      <PageHeader 
        title="Start Your Career With Us"
        subtitle="Join our dynamic UK high-street team at iRepair Mobiles. We are hiring passionate retail associates, customer service leads, and certified repair technicians across our 8 high-footfall branches."
        badge="JOIN THE IREPAIR TEAM"
        breadcrumbs={[
          { label: 'Home', onClick: () => setCurrentPage('home') },
          { label: 'Careers' }
        ]}
      />

      {/* 2. WHY CHOOSE A CAREER AT IREPAIR (Culture & Perks) */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-slate-50/60 to-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-50 border border-pink-200/80 text-[#DF0C88] text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Life At iRepair Mobiles UK</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading text-slate-900 tracking-tight">
              Why Build Your Future With Us?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Founded in 2014 as Phone Fresh UK Limited (Co. No. 03133908), we have grown into one of the UK’s most respected tech repair and certified refurbished retail networks. We believe in empowering our people with industry-leading training, vibrant workplaces, and real career progression.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-pink-200 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-pink-50 text-[#DF0C88] flex items-center justify-center font-bold">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 font-heading">
                Certified Training & Skills
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Whether in sales or hardware diagnostics, master modern micro-soldering, OEM parts fitting, and customer leadership through our certified training programs.
              </p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-pink-200 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 font-heading">
                Rapid Career Progression
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Over 70% of our store managers and lab heads began as sales associates or junior repair apprentices. We promote heavily from within.
              </p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-pink-200 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 font-heading">
                Performance Bonuses
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enjoy transparent monthly store bonuses, holiday pay (28 days annual leave), pension contributions, and generous employee discounts on all devices.
              </p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-pink-200 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 font-heading">
                8 Modern UK Branches
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Work in clean, air-conditioned, ESD-safe high-street retail stores located in vibrant shopping centres and town centres across England.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 3. ACTIVE JOB OPENINGS SECTION */}
      <section className="py-12 sm:py-16 bg-white" id="open-roles">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-[#DF0C88] text-xs font-bold uppercase tracking-wider mb-2">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Current Opportunities</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 tracking-tight">
                Explore Open Job Positions
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Showing {filteredJobs.length} active career {filteredJobs.length === 1 ? 'opening' : 'openings'} across our UK stores.
              </p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 mb-8 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center">
              
              {/* Search input */}
              <div className="sm:col-span-5 relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by job title or keyword..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#DF0C88] focus:border-[#DF0C88]"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Location filter */}
              <div className="sm:col-span-4">
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#DF0C88] text-slate-700 cursor-pointer"
                  >
                    {locations.map(loc => (
                      <option key={loc} value={loc}>
                        {loc === 'All' ? 'All UK Locations' : loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Department filter */}
              <div className="sm:col-span-3">
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#DF0C88] text-slate-700 cursor-pointer"
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>
                        {dept === 'All' ? 'All Departments' : dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-[#DF0C88] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-600">Loading career openings...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl text-center max-w-xl mx-auto space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="text-sm font-semibold">{error}</p>
              <button
                onClick={fetchJobs}
                className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredJobs.length === 0 && (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-3">
              <Briefcase className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-base font-bold text-slate-900">No Job Openings Match Your Filter</h4>
              <p className="text-xs text-slate-500">
                Try selecting a different location or clearing your search query. You can also send us a speculative CV below.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedLocation('All');
                  setSelectedDepartment('All');
                }}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Job Cards Grid */}
          {!loading && !error && filteredJobs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs hover:shadow-xl hover:border-pink-300 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    
                    {/* Top badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-[#DF0C88] bg-pink-50 border border-pink-200/60 px-2.5 py-0.5 rounded-full">
                        {job.department || 'Retail & Tech'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {job.employment_type || job.employmentType || 'Full-Time'}
                      </span>
                    </div>

                    {/* Job Title */}
                    <h3 className="text-lg font-bold font-heading text-slate-900 group-hover:text-[#DF0C88] transition-colors leading-snug">
                      {job.title}
                    </h3>

                    {/* Meta info: Location, Vacancies, Closing Date */}
                    <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#DF0C88] shrink-0" />
                        <span className="font-semibold text-slate-800">{job.location}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>
                          <strong>{job.vacancies}</strong> {job.vacancies === 1 ? 'Vacancy' : 'Vacancies'} available
                        </span>
                      </div>

                      {job.salary_range && (
                        <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                          <span className="w-4 h-4 flex items-center justify-center font-bold text-xs shrink-0">£</span>
                          <span>{job.salary_range}</span>
                        </div>
                      )}

                      {job.closing_date && (
                        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Closing Date: <strong>{new Date(job.closing_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Excerpt */}
                    <div className="pt-2 text-xs text-slate-500 line-clamp-3 leading-relaxed border-t border-slate-100">
                      {job.description ? job.description.replace(/<[^>]*>?/gm, ' ') : 'Exciting career opportunity at iRepair Mobiles.'}
                    </div>

                  </div>

                  {/* Action Buttons */}
                  <div className="pt-6 mt-4 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyNow(job)}
                      className="flex-1 bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-xs hover:shadow transition-all active:scale-[0.98] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Apply Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewJob(job)}
                      className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                      title="View Full Job Description"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* 4. SPECULATIVE APPLICATION CALLOUT */}
      <section className="py-12 sm:py-16 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
          <div className="max-w-2xl mx-auto space-y-3">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black font-heading tracking-tight">
              Don’t See The Exact Role You’re Looking For?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              We are constantly seeking brilliant customer advocates, store leaders, and diagnostic repair technicians. Submit your CV and tell us which branch you’d love to work in!
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => {
                if (jobs.length > 0) setSelectedJobId(jobs[0].id);
                setCurrentPage('apply-now');
              }}
              className="bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-lg transition-transform active:scale-95 inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Submit General Application</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="mailto:info@irepair-mobiles.co.uk?subject=Career%20Inquiry%20-%20iRepair%20Mobiles"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm px-6 py-3 rounded-xl transition-colors"
            >
              Email Hiring Team Directly
            </a>
          </div>
        </div>
      </section>

      {/* 5. JOB DESCRIPTION PREVIEW MODAL */}
      {previewJob && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">
                  {previewJob.department || 'Career Opening'}
                </span>
                <h3 className="text-lg sm:text-xl font-bold font-heading text-white">
                  {previewJob.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-300 mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#DF0C88]" />
                    {previewJob.location}
                  </span>
                  <span>•</span>
                  <span>{previewJob.vacancies} Vacancy</span>
                  {previewJob.salary_range && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold">{previewJob.salary_range}</span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewJob(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed prose prose-slate max-w-none prose-h3:text-sm prose-h3:font-bold prose-h3:text-slate-900 prose-ul:pl-4 prose-li:my-1">
              <div 
                dangerouslySetInnerHTML={{ __html: previewJob.description }} 
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPreviewJob(null)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Close Preview
              </button>

              <button
                type="button"
                onClick={() => {
                  const jobToApply = previewJob;
                  setPreviewJob(null);
                  handleApplyNow(jobToApply);
                }}
                className="bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold py-2.5 px-6 rounded-xl text-xs sm:text-sm shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Apply for this Role</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
