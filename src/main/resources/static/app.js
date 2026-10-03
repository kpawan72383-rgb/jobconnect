/* ===== JobConnect V2 — app.js ===== */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ST=['APPLIED','UNDER_REVIEW','SHORTLISTED','INTERVIEW','SELECTED','REJECTED'];
const lbl=s=>s.replace(/_/g,' ').toLowerCase().replace(/^./,c=>c.toUpperCase());
const pill=s=>`<span class="pill ${s}">${lbl(s)}</span>`;
const fd=d=>new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
const timeAgo=d=>{const s=Math.floor((Date.now()-new Date(d))/1000);if(s<60)return 'Just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return fd(d)};
const meta=j=>[j.location,j.jobType,j.salary,j.experience].filter(Boolean).map(esc).join(' · ');
const chips=s=>(s||'').split(',').filter(x=>x.trim()).map(x=>`<span class=chip>${esc(x.trim())}</span>`).join('');
const inp=(n,l,v='',t='text',ph='')=>`<label>${l}<input name="${n}" type="${t}" value="${esc(v)}" placeholder="${esc(ph)}"></label>`;
const ta=(n,l,v='',r=4,ph='')=>`<label>${l}<textarea name="${n}" rows="${r}" placeholder="${esc(ph)}">${esc(v)}</textarea></label>`;
const opts=(arr,v)=>arr.map(([a,b])=>`<option value="${esc(a)}" ${a===v?'selected':''}>${b}</option>`).join('');
const setMain=h=>{$('#main').innerHTML=h;};
const form=e=>{e.preventDefault();return Object.fromEntries(new FormData(e.target))};
const loading=()=>{setMain('<div class="loader"><div class="spinner"></div></div>')};

let me=JSON.parse(localStorage.getItem('jc')||'null'),view='jobs',JOBS=[],MY=[],SKILLS=[],SEL=null,applied=new Set(),saved=new Set();
let F={q:'',location:'',type:'',experience:'',salary:'',skill:'',sort:'latest'};
const TYPES=[['','Any type'],['Full Time','Full Time'],['Part Time','Part Time'],['Internship','Internship'],['Contract','Contract'],['Remote','Remote'],['Hybrid','Hybrid'],['On-site','On-site']];
const EXPS=[['','Select'],['Fresher','Fresher'],['0-2 years','0–2 years'],['2-5 years','2–5 years'],['5+ years','5+ years']];

// ===== API =====
async function api(path,o={}){
  const r={method:o.method||'GET',headers:{}};
  if(me)r.headers.Authorization='Bearer '+me.token;
  if(o.body instanceof FormData)r.body=o.body;else if(o.body){r.headers['Content-Type']='application/json';r.body=JSON.stringify(o.body)}
  const res=await fetch('/api'+path,r),t=await res.text();let d=null;try{d=t?JSON.parse(t):null}catch{}
  if(!res.ok){if(res.status===401&&me){me=null;localStorage.removeItem('jc');nav()}throw new Error(d?.message||'Something went wrong')}
  return d}

// ===== TOAST =====
let tt;function toast(m,type=''){const t=$('#toast');t.textContent=m;t.className=type;t.style.display='block';clearTimeout(tt);tt=setTimeout(()=>t.style.display='none',3500)}

// ===== MODAL =====
let modalCb=null;
function confirmModal(title,msg,cb){
  $('#modal-title').textContent=title;$('#modal-msg').textContent=msg;
  $('#modal-overlay').style.display='flex';modalCb=cb;
  $('#modal-confirm').onclick=()=>{closeModal();if(modalCb)modalCb()};
}
function closeModal(){$('#modal-overlay').style.display='none';modalCb=null}

// ===== NAV =====
function nav(){
  const sb=$('#sidebar'),sn=$('#sidebar-nav');
  if(!me){sb.style.display='none';sn.innerHTML='';renderTopNav();pollNotifs(false);return}
  sb.style.display='block';
  let links=[];
  if(me.role==='JOB_SEEKER') links=[
    ['dash','fa-home','Dashboard'],['jobs','fa-search','Find Jobs'],['saved','fa-bookmark','Saved Jobs'],
    ['apps','fa-file-alt','My Applications'],['profile','fa-user','My Profile'],['resume','fa-file-pdf','Resume']
  ];
  else if(me.role==='EMPLOYER') links=[
    ['edash','fa-home','Dashboard'],['jobform','fa-plus-circle','Post Job'],['myjobs','fa-briefcase','My Jobs'],
    ['allapps','fa-users','Applicants'],['company','fa-building','Company Profile']
  ];
  else if(me.role==='ADMIN') links=[
    ['adash','fa-home','Dashboard'],['users','fa-users','Users'],['adminemployers','fa-building','Employers'],
    ['adminjobs','fa-briefcase','Jobs'],['adminapps','fa-file-alt','Applications'],['adminskills','fa-tags','Skills']
  ];
  sn.innerHTML=links.map(([v,ic,t])=>`<a href="#" class="${view===v?'on':''}" onclick="go('${v}');return false"><i class="fas ${ic}"></i>${t}</a>`).join('')
    +`<div class="nav-section" style="margin-top:auto;padding-top:1.5rem"></div><a href="#" onclick="logout();return false"><i class="fas fa-sign-out-alt"></i>Logout</a>`;
  renderTopNav();
  if(me)pollNotifs(true);
}
function renderTopNav(){
  $('#who').innerHTML=me?`<span>${esc(me.name)}</span>`
    :`<button class="ghost" onclick="go('auth')">Log in</button><button class="ghost" style="background:rgba(255,255,255,.25)" onclick="go('auth','register')">Register</button>`;
  $('#notif-bell').style.display=me?'block':'none';
}

async function go(v,a){view=v;nav();scrollTo(0,0);loading();try{await V[v](a)}catch(e){toast(e.message,'bad')}}
async function logout(){try{await api('/auth/logout',{method:'POST'})}catch{}me=null;localStorage.removeItem('jc');applied.clear();saved.clear();go('jobs')}
const home=()=>go({JOB_SEEKER:'dash',EMPLOYER:'edash',ADMIN:'adash'}[me.role]);

// ===== NOTIFICATIONS =====
let notifInterval=null;
function pollNotifs(on){
  clearInterval(notifInterval);
  if(on&&me){fetchUnread();notifInterval=setInterval(fetchUnread,15000)}
}
async function fetchUnread(){
  try{const r=await api('/notifications/unread-count');const b=$('#notif-badge');
  if(r.count>0){b.textContent=r.count;b.style.display='flex'}else{b.style.display='none'}}catch{}}
function toggleNotifPanel(){const p=$('#notif-panel');p.style.display=p.style.display==='none'?'block':'none';if(p.style.display==='block')loadNotifs()}
async function loadNotifs(){
  const n=await api('/notifications');const p=$('#notif-panel');
  const typeIcon={APPLICATION_SUBMITTED:'fa-paper-plane',STATUS_CHANGED:'fa-exchange-alt',NEW_APPLICATION:'fa-user-plus',DEADLINE_APPROACHING:'fa-clock'};
  p.innerHTML=`<div class="panel-header"><span>Notifications</span>${n.some(x=>!x.read)?`<a href="#" onclick="markAllRead();return false" style="font-size:.82rem">Mark all read</a>`:''}</div>`
    +(n.length?n.map(x=>`<div class="notif-item ${x.read?'':'unread'}" onclick="markNotifRead(${x.notificationId})">
      <div class="notif-icon"><i class="fas ${typeIcon[x.type]||'fa-bell'}"></i></div>
      <div class="notif-text"><div>${esc(x.message)}</div><div class="notif-time">${timeAgo(x.createdAt)}</div></div></div>`).join('')
    :'<div class="notif-empty"><i class="fas fa-bell-slash" style="font-size:1.5rem;margin-bottom:.5rem;display:block"></i>No notifications yet</div>');
}
async function markNotifRead(id){try{await api(`/notifications/${id}/read`,{method:'PUT'});fetchUnread();loadNotifs()}catch{}}
async function markAllRead(){try{await api('/notifications/read-all',{method:'PUT'});fetchUnread();loadNotifs()}catch{}}
document.addEventListener('click',e=>{if(!e.target.closest('#notif-bell'))$('#notif-panel').style.display='none'});

const V={};

// ===== AUTH =====
V.auth=async(mode='login')=>{const reg=mode==='register';
  setMain(`<section class="card card-narrow"><h1 style="font-size:1.5rem;font-weight:800;margin-bottom:1rem">${reg?'Create your account':'Welcome back'}</h1>
  <form onsubmit="return authGo(event,'${mode}')">
  ${reg?`${inp('name','Full name','','text','Enter your full name')}<fieldset><legend style="font-weight:600;font-size:.88rem">I am a...</legend>
  <label class=r><input type=radio name=role value=JOB_SEEKER checked onchange="$('#cn').hidden=true">Job Seeker</label>
  <label class=r><input type=radio name=role value=EMPLOYER onchange="$('#cn').hidden=false">Employer</label></fieldset>
  <div id=cn hidden>${inp('companyName','Company name','','text','Your company name')}</div>`:''}
  ${inp('email','Email','','email','your@email.com')}${inp('password','Password','','password','Min 6 characters')}
  <button class="btn btn-primary" style="width:100%;margin-top:.8rem;padding:.7rem">${reg?'Create account':'Log in'}</button></form>
  <p style="text-align:center;margin-top:1rem;font-size:.9rem">${reg?`Already registered? <a href="#" onclick="go('auth');return false">Log in</a>`:`New here? <a href="#" onclick="go('auth','register');return false">Create an account</a>`}</p></section>`)};
async function authGo(e,mode){const b=form(e);try{me=await api('/auth/'+mode,{method:'POST',body:b});localStorage.setItem('jc',JSON.stringify(me));toast('Welcome, '+me.name,'good');home()}catch(x){toast(x.message,'bad')}return false}

// ===== JOB SEEKER DASHBOARD =====
V.dash=async()=>{
  const d=await api('/seeker/dashboard');
  let h=`<div class="welcome-banner"><h1><i class="fas fa-hand-wave"></i> Welcome back, ${esc(me.name)}!</h1><p>Here's your job search overview</p></div>`;
  h+=`<div class="stats-grid">
    <div class="stat-card"><div class="stat-icon"><i class="fas fa-file-alt"></i></div><div class="stat-value">${d.totalApplications}</div><div class="stat-label">Total Applications</div></div>
    <div class="stat-card gold"><div class="stat-icon"><i class="fas fa-clock"></i></div><div class="stat-value">${d.applied}</div><div class="stat-label">Pending</div></div>
    <div class="stat-card green"><div class="stat-icon"><i class="fas fa-check-circle"></i></div><div class="stat-value">${d.shortlisted}</div><div class="stat-label">Shortlisted</div></div>
    <div class="stat-card red"><div class="stat-icon"><i class="fas fa-times-circle"></i></div><div class="stat-value">${d.rejected}</div><div class="stat-label">Rejected</div></div>
    <div class="stat-card purple"><div class="stat-icon"><i class="fas fa-star"></i></div><div class="stat-value">${d.selected}</div><div class="stat-label">Selected</div></div>
    <div class="stat-card cyan"><div class="stat-icon"><i class="fas fa-bookmark"></i></div><div class="stat-value">${d.savedJobs}</div><div class="stat-label">Saved Jobs</div></div>
  </div>`;
  // Recent applications
  if(d.recentApplications&&d.recentApplications.length){
    h+=`<h2 style="font-size:1.15rem;font-weight:700;margin:1.5rem 0 .8rem"><i class="fas fa-history"></i> Recent Applications</h2>`;
    h+=d.recentApplications.map(x=>`<div class="row-card"><div><b>${esc(x.job.title)}</b><small>${esc(x.job.employer.companyName)} · Applied ${fd(x.appliedAt)}</small></div><div>${pill(x.status)}</div></div>`).join('');
  }
  // Recommendations
  if(d.recommendations&&d.recommendations.length){
    h+=`<h2 style="font-size:1.15rem;font-weight:700;margin:1.5rem 0 .8rem"><i class="fas fa-lightbulb"></i> Recommended Jobs For You</h2>`;
    h+=d.recommendations.map(r=>`<div class="rec-card"><div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:.5rem"><div><b>${esc(r.job.title)}</b><small style="color:var(--muted)">${esc(r.job.employer.companyName)} · ${meta(r.job)}</small>
      <div class="rec-reasons"><i class="fas fa-check-circle"></i> ${r.reasons.join(' · ')}</div></div>
      <button class="btn btn-primary btn-sm" onclick="go('jobdetail',${r.job.jobId})">View Job</button></div></div>`).join('');
  }
  setMain(h);
};

// ===== EMPLOYER DASHBOARD =====
V.edash=async()=>{
  const d=await api('/employer/dashboard');
  let h=`<div class="welcome-banner"><h1><i class="fas fa-building"></i> Welcome, ${esc(me.name)}!</h1><p>Manage your job postings and applicants</p></div>`;
  h+=`<div class="stats-grid">
    <div class="stat-card"><div class="stat-icon"><i class="fas fa-briefcase"></i></div><div class="stat-value">${d.totalJobs}</div><div class="stat-label">Total Jobs Posted</div></div>
    <div class="stat-card green"><div class="stat-icon"><i class="fas fa-check"></i></div><div class="stat-value">${d.activeJobs}</div><div class="stat-label">Active Jobs</div></div>
    <div class="stat-card"><div class="stat-icon"><i class="fas fa-lock"></i></div><div class="stat-value">${d.closedJobs}</div><div class="stat-label">Closed Jobs</div></div>
    <div class="stat-card purple"><div class="stat-icon"><i class="fas fa-users"></i></div><div class="stat-value">${d.totalApplicants}</div><div class="stat-label">Total Applicants</div></div>
  </div>`;
  if(d.recentApplicants&&d.recentApplicants.length){
    h+=`<h2 style="font-size:1.15rem;font-weight:700;margin:1.5rem 0 .8rem"><i class="fas fa-user-clock"></i> Recent Applicants</h2>`;
    h+=d.recentApplicants.map(x=>`<div class="row-card"><div><b>${esc(x.seeker.user.name)}</b><small>${esc(x.job.title)} · Applied ${fd(x.appliedAt)}</small></div><div>${pill(x.status)}</div></div>`).join('');
  }
  setMain(h);
};

// ===== ADMIN DASHBOARD =====
V.adash=async()=>{const s=await api('/admin/stats');
  let h=`<div class="welcome-banner"><h1><i class="fas fa-shield-alt"></i> Admin Dashboard</h1><p>Platform overview and management</p></div>`;
  h+=`<div class="stats-grid">
    <div class="stat-card"><div class="stat-icon"><i class="fas fa-users"></i></div><div class="stat-value">${s.totalUsers}</div><div class="stat-label">Total Users</div></div>
    <div class="stat-card cyan"><div class="stat-icon"><i class="fas fa-user-tie"></i></div><div class="stat-value">${s.jobSeekers}</div><div class="stat-label">Job Seekers</div></div>
    <div class="stat-card purple"><div class="stat-icon"><i class="fas fa-building"></i></div><div class="stat-value">${s.employers}</div><div class="stat-label">Employers</div></div>
    <div class="stat-card green"><div class="stat-icon"><i class="fas fa-briefcase"></i></div><div class="stat-value">${s.totalJobs}</div><div class="stat-label">Total Jobs</div></div>
    <div class="stat-card gold"><div class="stat-icon"><i class="fas fa-clock"></i></div><div class="stat-value">${s.pendingJobs}</div><div class="stat-label">Pending Approval</div></div>
    <div class="stat-card"><div class="stat-icon"><i class="fas fa-file-alt"></i></div><div class="stat-value">${s.applications}</div><div class="stat-label">Applications</div></div>
  </div>`;
  setMain(h);
};

// ===== PUBLIC JOB SEARCH =====
V.jobs=async()=>{
  if(!SKILLS.length)SKILLS=await api('/skills');
  if(me?.role==='JOB_SEEKER')await marks();
  setMain(`<div class="page-header"><h1>Find Jobs</h1></div>
  <div class="search-bar"><input name=q id=sq placeholder="Job title, skill, or company..." value="${esc(F.q)}" onkeydown="if(event.key==='Enter')runSearch()">
  <input name=location id=sloc placeholder="Location..." value="${esc(F.location)}" onkeydown="if(event.key==='Enter')runSearch()">
  <button class="btn btn-primary" onclick="runSearch()"><i class="fas fa-search"></i> Search</button></div>
  <div class="filters-row">
    <select id=ftype onchange="runSearch()">${opts(TYPES,F.type)}</select>
    <select id=fexp onchange="runSearch()">${opts([['','Any experience'],...EXPS.slice(1)],F.experience)}</select>
    <select id=fsal onchange="runSearch()">${opts([['','Any salary'],['3','₹3 LPA+'],['5','₹5 LPA+'],['8','₹8 LPA+'],['12','₹12 LPA+']],F.salary)}</select>
    <select id=fskill onchange="runSearch()">${opts([['','Any skill'],...SKILLS.map(s=>[s.skillName,s.skillName])],F.skill)}</select>
    <select id=fsort class="sort-select" onchange="sortJobs()"><option value="latest">Latest</option><option value="sal_asc">Salary: Low → High</option><option value="sal_desc">Salary: High → Low</option></select>
  </div>
  <div class=split><div id=list></div><article id=detail></article></div>`);
  await runSearchAPI()};

async function runSearch(){
  F.q=$('#sq')?.value||'';F.location=$('#sloc')?.value||'';
  F.type=$('#ftype')?.value||'';F.experience=$('#fexp')?.value||'';
  F.salary=$('#fsal')?.value||'';F.skill=$('#fskill')?.value||'';
  await runSearchAPI();
}
async function runSearchAPI(){
  JOBS=await api('/jobs?'+new URLSearchParams({q:F.q,location:F.location,type:F.type,experience:F.experience,salary:F.salary||'0',skill:F.skill}));
  sortJobs();
}
function sortJobs(){
  const s=$('#fsort')?.value||'latest';
  if(s==='sal_asc')JOBS.sort((a,b)=>(a.salaryMin||0)-(b.salaryMin||0));
  else if(s==='sal_desc')JOBS.sort((a,b)=>(b.salaryMin||0)-(a.salaryMin||0));
  else JOBS.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  SEL=JOBS[0]?.jobId??null;drawList();showJob(SEL);
}
function drawList(){$('#list').innerHTML=JOBS.length?JOBS.map(j=>`<button class="job-card ${j.jobId===SEL?'on':''}" onclick="showJob(${j.jobId})"><b>${esc(j.title)}</b><span class="company-name">${esc(j.employer.companyName)}</span><small>${meta(j)}</small></button>`).join('')
  :'<div style="text-align:center;padding:2rem;color:var(--muted)"><i class="fas fa-search" style="font-size:2rem;margin-bottom:.5rem;display:block"></i>No jobs match your search</div>'}
function showJob(id){
  SEL=id;drawList();const j=JOBS.find(x=>x.jobId===id),d=$('#detail');
  if(!j){d.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted)"><i class="fas fa-briefcase" style="font-size:2.5rem;margin-bottom:.8rem;display:block;opacity:.3"></i><h2 style="margin:0">Select a job</h2><p>Click on a job to see details</p></div>';return}
  let act='';
  if(!me)act=`<button class="btn btn-primary" onclick="go('auth')"><i class="fas fa-sign-in-alt"></i> Log in to apply</button>`;
  else if(me.role==='JOB_SEEKER')act=(applied.has(id)?`<button class="btn btn-primary" disabled><i class="fas fa-check"></i> Already Applied</button>`:`<button class="btn btn-primary" onclick="apply(${id})"><i class="fas fa-paper-plane"></i> Apply Now</button>`)
    +` <button class="btn btn-ghost" onclick="toggleSave(${id})"><i class="fas ${saved.has(id)?'fa-bookmark':'fa-bookmark'}" style="color:${saved.has(id)?'var(--gold)':'inherit'}"></i> ${saved.has(id)?'Saved':'Save Job'}</button>`;
  d.innerHTML=`<h2>${esc(j.title)}</h2><p class="company"><i class="fas fa-building"></i> ${esc(j.employer.companyName)}</p>
    <p class="meta-line"><i class="fas fa-map-marker-alt"></i> ${esc(j.location||'Not specified')} · <i class="fas fa-clock"></i> ${esc(j.jobType||'N/A')} · <i class="fas fa-rupee-sign"></i> ${esc(j.salary||'Not specified')} · <i class="fas fa-star"></i> ${esc(j.experience||'Any')}</p>
    <div style="margin:.6rem 0">${chips(j.skills)}</div>
    ${j.deadline?`<p class="meta-line"><i class="fas fa-calendar-alt"></i> Deadline: ${fd(j.deadline)}</p>`:''}
    <div class="detail-section"><h3><i class="fas fa-file-text"></i> Description</h3><div class="desc">${esc(j.description)}</div></div>
    ${j.responsibilities?`<div class="detail-section"><h3><i class="fas fa-tasks"></i> Responsibilities</h3><div class="desc">${esc(j.responsibilities)}</div></div>`:''}
    ${j.qualifications?`<div class="detail-section"><h3><i class="fas fa-graduation-cap"></i> Qualifications</h3><div class="desc">${esc(j.qualifications)}</div></div>`:''}
    <div class="detail-stats"><span><i class="fas fa-calendar"></i> Posted ${fd(j.createdAt)}</span></div>
    <div class="btns" style="margin-top:1rem">${act}</div>`;
}
// V2: Full job details page (standalone)
V.jobdetail=async id=>{
  const j=await api('/jobs/'+id);if(me?.role==='JOB_SEEKER')await marks();
  let act='';
  if(!me)act=`<button class="btn btn-primary" onclick="go('auth')"><i class="fas fa-sign-in-alt"></i> Log in to apply</button>`;
  else if(me.role==='JOB_SEEKER')act=(applied.has(id)?`<button class="btn btn-primary" disabled><i class="fas fa-check"></i> Already Applied</button>`:`<button class="btn btn-primary" onclick="apply(${id})"><i class="fas fa-paper-plane"></i> Apply Now</button>`)
    +` <button class="btn btn-ghost" onclick="toggleSave(${id})"><i class="fas fa-bookmark" style="color:${saved.has(id)?'var(--gold)':'inherit'}"></i> ${saved.has(id)?'Saved':'Save Job'}</button>`;
  setMain(`<button class="btn btn-ghost btn-sm" onclick="go('jobs')" style="margin-bottom:1rem"><i class="fas fa-arrow-left"></i> Back to Jobs</button>
    <div class="card"><h1 style="font-size:1.6rem">${esc(j.title)}</h1>
    <p style="color:var(--muted);font-size:1rem;margin:.3rem 0"><i class="fas fa-building"></i> ${esc(j.employer.companyName)}</p>
    <p style="color:var(--muted);font-size:.9rem;margin:.5rem 0"><i class="fas fa-map-marker-alt"></i> ${esc(j.location||'Not specified')} · <i class="fas fa-clock"></i> ${esc(j.jobType||'N/A')} · <i class="fas fa-rupee-sign"></i> ${esc(j.salary||'Not specified')} · <i class="fas fa-star"></i> ${esc(j.experience||'Any')}</p>
    <div style="margin:.8rem 0">${chips(j.skills)}</div>
    ${j.deadline?`<p style="color:var(--muted);font-size:.88rem"><i class="fas fa-calendar-alt"></i> Deadline: ${fd(j.deadline)}</p>`:''}
    <hr style="margin:1rem 0;border:none;border-top:1px solid var(--line)">
    <div class="detail-section"><h3><i class="fas fa-file-text"></i> Description</h3><div class="desc">${esc(j.description)}</div></div>
    ${j.responsibilities?`<div class="detail-section"><h3><i class="fas fa-tasks"></i> Responsibilities</h3><div class="desc">${esc(j.responsibilities)}</div></div>`:''}
    ${j.qualifications?`<div class="detail-section"><h3><i class="fas fa-graduation-cap"></i> Qualifications</h3><div class="desc">${esc(j.qualifications)}</div></div>`:''}
    <div style="display:flex;gap:1rem;color:var(--muted);font-size:.85rem;margin:1rem 0"><span><i class="fas fa-calendar"></i> Posted ${fd(j.createdAt)}</span></div>
    <div class="btns" style="margin-top:1rem">${act}</div></div>`);
};

async function marks(){const[a,s]=await Promise.all([api('/seeker/applications'),api('/seeker/saved')]);applied=new Set(a.map(x=>x.job.jobId));saved=new Set(s.map(x=>x.job.jobId))}
async function apply(id){try{await api(`/jobs/${id}/apply`,{method:'POST'});applied.add(id);toast('Application submitted!','good');if(view==='jobdetail')go('jobdetail',id);else if($('#detail'))showJob(id)}catch(e){toast(e.message,'bad')}}
async function toggleSave(id){try{const on=saved.has(id);await api(`/jobs/${id}/save`,{method:on?'DELETE':'POST'});on?saved.delete(id):saved.add(id);toast(on?'Removed from saved':'Job saved','good');if(view==='saved')go('saved');else if(view==='jobdetail')go('jobdetail',id);else showJob(id)}catch(e){toast(e.message,'bad')}}

// ===== JOB SEEKER PROFILE =====
V.profile=async()=>{const p=await api('/seeker/profile');
  setMain(`<section class="card">
  <div class="profile-header"><div class="profile-avatar">${esc(p.user.name.charAt(0).toUpperCase())}</div>
  <div class="profile-info"><h2>${esc(p.user.name)}</h2><p><i class="fas fa-envelope"></i> ${esc(p.user.email)}</p></div></div>
  <form onsubmit="return saveProfile(event)">
  <h2 style="font-size:1.1rem;margin:1rem 0 .5rem"><i class="fas fa-user"></i> Personal Information</h2>
  <div class=g2>${inp('name','Full Name',p.user.name)}
  <label>Email<input value="${esc(p.user.email)}" disabled></label>
  ${inp('phone','Phone',p.phone,'tel','Your phone number')}
  ${inp('location','Location',p.location,'text','City, State')}</div>
  ${ta('careerObjective','Career Objective',p.careerObjective,3,'Brief summary of your career goals...')}
  <h2 style="font-size:1.1rem;margin:1.2rem 0 .5rem"><i class="fas fa-graduation-cap"></i> Education</h2>
  <div class=g3>${inp('education','Qualification',p.education,'text','e.g. B.Tech, MCA')}
  ${inp('college','College / University',p.college,'text','Institution name')}
  ${inp('degree','Degree',p.degree,'text','e.g. Computer Science')}</div>
  <div class=g2>${inp('graduationYear','Graduation Year',p.graduationYear,'text','e.g. 2025')}
  <label>Experience<select name=experience>${opts(EXPS,p.experience||'')}</select></label></div>
  <h2 style="font-size:1.1rem;margin:1.2rem 0 .5rem"><i class="fas fa-code"></i> Skills & Projects</h2>
  ${inp('skills','Skills (comma separated)',p.skills,'text','e.g. Java, Python, SQL, React')}
  ${ta('projects','Projects',p.projects,4,'Describe your key projects...')}
  ${ta('certifications','Certifications',p.certifications,2,'List your certifications...')}
  <h2 style="font-size:1.1rem;margin:1.2rem 0 .5rem"><i class="fas fa-link"></i> Online Profiles</h2>
  <div class=g2>${inp('linkedin','LinkedIn URL',p.linkedin,'url','https://linkedin.com/in/...')}
  ${inp('github','GitHub URL',p.github,'url','https://github.com/...')}</div>
  ${ta('about','About Me',p.about,4,'Tell us about yourself...')}
  <button class="btn btn-primary" style="margin-top:1rem"><i class="fas fa-save"></i> Save Profile</button></form></section>`)};
async function saveProfile(e){try{await api('/seeker/profile',{method:'PUT',body:form(e)});toast('Profile saved!','good')}catch(x){toast(x.message,'bad')}return false}

// ===== RESUME =====
V.resume=async()=>{const p=await api('/seeker/profile');
  setMain(`<section class="card">
  <h1 style="font-size:1.4rem;margin-bottom:1rem"><i class="fas fa-file-pdf"></i> Resume</h1>
  <p style="color:var(--muted);margin-bottom:1.2rem">Upload your resume to start applying for jobs. Accepted formats: PDF, DOC, DOCX (max 5 MB).</p>
  ${p.resume?`<div class="row-card" style="margin-bottom:1rem"><div><b><i class="fas fa-file"></i> Current Resume</b><small>Uploaded successfully</small></div>
  <a href="${p.resume}" target="_blank" class="btn btn-ghost btn-sm"><i class="fas fa-download"></i> View / Download</a></div>`
  :'<div style="background:var(--gold-light);padding:1rem;border-radius:var(--radius-sm);margin-bottom:1rem;font-size:.9rem"><i class="fas fa-exclamation-triangle" style="color:var(--gold)"></i> No resume uploaded yet. You need a resume to apply for jobs.</div>'}
  <div style="display:flex;gap:.8rem;align-items:center;flex-wrap:wrap">
  <input type=file id=rf accept=".pdf,.doc,.docx" style="width:auto;max-width:300px">
  <button class="btn btn-primary" onclick="upload()"><i class="fas fa-upload"></i> Upload Resume</button></div></section>`)};
async function upload(){const f=$('#rf').files[0];if(!f)return toast('Choose a file first','bad');
  const n=f.name.toLowerCase();if(!(n.endsWith('.pdf')||n.endsWith('.doc')||n.endsWith('.docx')))return toast('Only PDF, DOC, DOCX allowed','bad');
  if(f.size>5*1024*1024)return toast('File must be under 5 MB','bad');
  const fd=new FormData();fd.append('file',f);
  try{await api('/seeker/resume',{method:'POST',body:fd});toast('Resume uploaded!','good');go('resume')}catch(x){toast(x.message,'bad')}}

// ===== APPLICATIONS =====
V.apps=async()=>{const a=await api('/seeker/applications');
  setMain(`<div class="page-header"><h1>My Applications</h1></div>${a.length?'<div class="scroll">'+table(['Job','Company','Applied','Status'],a.map(x=>[
    `<a href="#" onclick="go('jobdetail',${x.job.jobId});return false">${esc(x.job.title)}</a>`,esc(x.job.employer.companyName),fd(x.appliedAt),pill(x.status)]))+'</div>'
  :'<div class="card" style="text-align:center;padding:2rem;color:var(--muted)"><i class="fas fa-file-alt" style="font-size:2rem;margin-bottom:.5rem;display:block"></i><p>No applications yet. <a href="#" onclick="go(\'jobs\');return false">Search jobs</a> to apply.</p></div>'}`)};

// ===== SAVED JOBS =====
V.saved=async()=>{const s=await api('/seeker/saved');await marks();JOBS=s.map(x=>x.job);
  setMain(`<div class="page-header"><h1>Saved Jobs</h1></div>${s.length?JOBS.map(j=>`<div class="row-card">
  <div><b><a href="#" onclick="go('jobdetail',${j.jobId});return false">${esc(j.title)}</a></b><small>${esc(j.employer.companyName)} · ${meta(j)}</small></div>
  <div class="btns">${applied.has(j.jobId)?'<button class="btn btn-sm" disabled>Applied</button>':`<button class="btn btn-primary btn-sm" onclick="apply(${j.jobId}).then(()=>go('saved'))">Apply</button>`}
  <button class="btn btn-ghost btn-sm" onclick="toggleSave(${j.jobId})"><i class="fas fa-trash"></i> Remove</button></div></div>`).join('')
  :'<div class="card" style="text-align:center;padding:2rem;color:var(--muted)"><i class="fas fa-bookmark" style="font-size:2rem;margin-bottom:.5rem;display:block"></i><p>No saved jobs. Save jobs from the search page.</p></div>'}`)};

// ===== EMPLOYER: COMPANY =====
V.company=async()=>{const c=await api('/employer/profile');
  setMain(`<section class="card"><h1 style="font-size:1.4rem;margin-bottom:1rem"><i class="fas fa-building"></i> Company Profile</h1>
  <form onsubmit="return saveCompany(event)"><div class=g2>
  ${inp('companyName','Company Name',c.companyName)}${inp('location','Location',c.location,'text','City, State')}
  ${inp('website','Website',c.website,'url','https://...')}</div>
  ${ta('description','About the Company',c.description,5,'Tell candidates about your company...')}
  <button class="btn btn-primary" style="margin-top:.8rem"><i class="fas fa-save"></i> Save Company</button></form></section>`)};
async function saveCompany(e){try{await api('/employer/profile',{method:'PUT',body:form(e)});toast('Company profile saved!','good')}catch(x){toast(x.message,'bad')}return false}

// ===== EMPLOYER: MY JOBS =====
V.myjobs=async()=>{MY=await api('/employer/jobs');
  setMain(`<div class="page-header"><h1>My Jobs</h1><button class="btn btn-primary" onclick="go('jobform')"><i class="fas fa-plus"></i> Post New Job</button></div>
  ${MY.length?MY.map(j=>`<div class="row-card"><div style="flex:1"><b>${esc(j.title)}</b><small>${meta(j)}</small></div>
  <div>${pill(j.status)} ${j.approved?'':'<span class="pill PENDING">Pending Approval</span>'}</div>
  <div class="btns"><button class="btn btn-ghost btn-sm" onclick="go('applicants',${j.jobId})"><i class="fas fa-users"></i> Applicants</button>
  <button class="btn btn-ghost btn-sm" onclick="go('jobform',${j.jobId})"><i class="fas fa-edit"></i> Edit</button>
  <button class="btn btn-ghost btn-sm" onclick="jobStatus(${j.jobId},'${j.status==='ACTIVE'?'CLOSED':'ACTIVE'}')"><i class="fas fa-${j.status==='ACTIVE'?'lock':'lock-open'}"></i> ${j.status==='ACTIVE'?'Close':'Reopen'}</button>
  <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="confirmModal('Delete Job','Delete this job and all applications?',()=>delJob(${j.jobId}))"><i class="fas fa-trash"></i></button></div></div>`).join('')
  :'<div class="card" style="text-align:center;padding:2rem;color:var(--muted)"><p>No jobs posted yet. <a href="#" onclick="go(\'jobform\');return false">Post your first job</a>.</p></div>'}`)};

// ===== EMPLOYER: POST/EDIT JOB =====
V.jobform=async id=>{const j=id?(await api('/employer/jobs')).find(x=>x.jobId===id):{}; if(!SKILLS.length)SKILLS=await api('/skills');
  setMain(`<section class="card"><h1 style="font-size:1.4rem;margin-bottom:1rem"><i class="fas fa-${id?'edit':'plus-circle'}"></i> ${id?'Edit Job':'Post a Job'}</h1>
  <form onsubmit="return saveJob(event,${id||0},'${j.status||'ACTIVE'}')">
  ${inp('title','Job Title *',j.title,'text','e.g. Software Engineer')}
  <div class=g2>${inp('location','Location',j.location,'text','e.g. Bangalore, Remote')}
  <label>Job Type<select name=jobType>${opts(TYPES.slice(1),j.jobType)}</select></label>
  <label>Experience Required<select name=experience>${opts(EXPS,j.experience)}</select></label>
  ${inp('salary','Salary (display text)',j.salary,'text','e.g. ₹4–6 LPA')}
  ${inp('salaryMin','Minimum Salary in LPA (for filters)',j.salaryMin??'','number')}
  ${inp('deadline','Application Deadline',j.deadline?j.deadline.substring(0,10):'','date')}</div>
  ${inp('skills','Required Skills (comma separated)',j.skills,'text','e.g. Java, Spring Boot, MySQL')}
  ${ta('description','Job Description *',j.description,6,'Describe the role, responsibilities...')}
  ${ta('responsibilities','Responsibilities',j.responsibilities,5,'List key responsibilities...')}
  ${ta('qualifications','Qualifications',j.qualifications,4,'Required and preferred qualifications...')}
  <button class="btn btn-primary" style="margin-top:.8rem"><i class="fas fa-save"></i> ${id?'Save Changes':'Post Job'}</button></form>
  <p style="color:var(--muted);font-size:.85rem;margin-top:.8rem"><i class="fas fa-info-circle"></i> New postings appear in search after admin approval.</p></section>`)};
async function saveJob(e,id,status){const b=form(e);b.salaryMin=parseFloat(b.salaryMin)||0;b.status=status;
  if(b.deadline)b.deadline=b.deadline+'T23:59:59';else b.deadline=null;
  try{await api(id?`/employer/jobs/${id}`:'/employer/jobs',{method:id?'PUT':'POST',body:b});toast(id?'Changes saved!':'Job posted! Awaiting admin approval.','good');go('myjobs')}catch(x){toast(x.message,'bad')}return false}
async function jobStatus(id,s){try{await api(`/employer/jobs/${id}/status`,{method:'PUT',body:{status:s}});toast('Job '+(s==='CLOSED'?'closed':'reopened'),'good');go('myjobs')}catch(x){toast(x.message,'bad')}}
async function delJob(id){try{await api(`/employer/jobs/${id}`,{method:'DELETE'});toast('Job deleted','good');go('myjobs')}catch(x){toast(x.message,'bad')}}

// ===== EMPLOYER: ALL APPLICANTS =====
V.allapps=async()=>{MY=await api('/employer/jobs');
  let allApps=[];for(const j of MY){const a=await api(`/employer/jobs/${j.jobId}/applications`);allApps.push(...a.map(x=>({...x,_job:j})));}
  allApps.sort((a,b)=>new Date(b.appliedAt)-new Date(a.appliedAt));
  setMain(`<div class="page-header"><h1>All Applicants (${allApps.length})</h1></div>
  ${allApps.length?allApps.map(x=>{const s=x.seeker;return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:.8rem">
  <div><b>${esc(s.user.name)}</b> applied for <b>${esc(x.job.title)}</b><small style="color:var(--muted)">${esc(s.user.email)} · ${esc(s.phone||'No phone')} · Applied ${fd(x.appliedAt)}</small>
  <p style="margin:.4rem 0">${chips(s.skills)}</p><p style="font-size:.88rem;color:var(--muted)">${esc(s.education||'')} ${s.experience?'· '+esc(s.experience):''}</p>
  ${x.resume?`<a href="${x.resume}" target="_blank" class="btn btn-ghost btn-sm" style="margin-top:.3rem"><i class="fas fa-file-pdf"></i> View Resume</a>`:''}</div>
  <select style="width:auto" onchange="setApp(${x.applicationId},this.value)">${opts(ST.map(t=>[t,lbl(t)]),x.status)}</select></div></div>`}).join('')
  :'<div class="card" style="text-align:center;padding:2rem;color:var(--muted)"><p>No applicants yet.</p></div>'}`)};

// ===== EMPLOYER: APPLICANTS FOR A JOB =====
V.applicants=async id=>{const a=await api(`/employer/jobs/${id}/applications`);
  setMain(`<button class="btn btn-ghost btn-sm" onclick="go('myjobs')" style="margin-bottom:1rem"><i class="fas fa-arrow-left"></i> Back to My Jobs</button>
  <div class="page-header"><h1>Applicants (${a.length})</h1></div>
  ${a.length?a.map(x=>{const s=x.seeker;return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:.8rem">
  <div><b>${esc(s.user.name)}</b><small style="color:var(--muted)">${esc(s.user.email)} · ${esc(s.phone||'No phone')} · ${esc(s.location||'No location')}</small>
  <p style="margin:.4rem 0">${chips(s.skills)}</p><p style="font-size:.88rem;color:var(--muted)">${esc(s.education||'')} ${s.experience?'· '+esc(s.experience):''}</p>
  <p style="font-size:.88rem">${esc(s.about||'')}</p>
  ${x.resume?`<a href="${x.resume}" target="_blank" class="btn btn-ghost btn-sm" style="margin-top:.3rem"><i class="fas fa-file-pdf"></i> View Resume</a>`:''}</div>
  <select style="width:auto" onchange="setApp(${x.applicationId},this.value)">${opts(ST.map(t=>[t,lbl(t)]),x.status)}</select></div></div>`}).join('')
  :'<div class="card" style="text-align:center;padding:2rem;color:var(--muted)"><p>No applicants yet.</p></div>'}`)};
async function setApp(id,s){try{await api(`/employer/applications/${id}/status`,{method:'PUT',body:{status:s}});toast('Status updated to '+lbl(s),'good')}catch(x){toast(x.message,'bad')}}

// ===== ADMIN =====
const table=(h,rows)=>`<table><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

V.users=async()=>{const u=await api('/admin/users');
  setMain(`<div class="page-header"><h1>Users</h1></div><div class="scroll">${table(['Name','Email','Role','Joined',''],u.map(x=>[esc(x.name),esc(x.email),pill(x.role==='JOB_SEEKER'?'APPLIED':x.role==='EMPLOYER'?'INTERVIEW':'ACTIVE').replace(/>.*</,'>'+lbl(x.role)+'<'),fd(x.createdAt),
  x.role==='ADMIN'?'':`<button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="confirmModal('Remove User','Remove this account and all linked data?',()=>rmUser(${x.userId}))"><i class="fas fa-trash"></i> Remove</button>`]))}</div>`)};
async function rmUser(id){try{await api('/admin/users/'+id,{method:'DELETE'});toast('Account removed','good');go('users')}catch(x){toast(x.message,'bad')}}

V.adminemployers=async()=>{const e=await api('/admin/employers');
  setMain(`<div class="page-header"><h1>Employers</h1></div><div class="scroll">${table(['Company','Contact','Location','Website'],e.map(x=>[esc(x.companyName),esc(x.user.name)+' ('+esc(x.user.email)+')',esc(x.location||'-'),x.website?`<a href="${esc(x.website)}" target="_blank">${esc(x.website)}</a>`:'-']))}</div>`)};

V.adminjobs=async()=>{const j=await api('/admin/jobs');
  setMain(`<div class="page-header"><h1>Jobs</h1></div><div class="scroll">${table(['Title','Company','Status','Approval',''],j.map(x=>[esc(x.title),esc(x.employer.companyName),pill(x.status),
  x.approved?'<span class="pill ACTIVE">Approved</span>':'<span class="pill PENDING">Pending</span>',
  `<div class="btns">${x.approved?'':`<button class="btn btn-primary btn-sm" onclick="approve(${x.jobId})"><i class="fas fa-check"></i> Approve</button>`}<button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="confirmModal('Remove Job','Remove this job and its applications?',()=>rmJob(${x.jobId}))"><i class="fas fa-trash"></i></button></div>`]))}</div>`)};
async function approve(id){try{await api(`/admin/jobs/${id}/approve`,{method:'PUT'});toast('Job approved!','good');go('adminjobs')}catch(x){toast(x.message,'bad')}}
async function rmJob(id){try{await api('/admin/jobs/'+id,{method:'DELETE'});toast('Job removed','good');go('adminjobs')}catch(x){toast(x.message,'bad')}}

V.adminapps=async()=>{const a=await api('/admin/applications');
  setMain(`<div class="page-header"><h1>Applications</h1></div><div class="scroll">${table(['Candidate','Job','Company','Applied','Status'],a.map(x=>[esc(x.seeker.user.name),esc(x.job.title),esc(x.job.employer.companyName),fd(x.appliedAt),pill(x.status)]))}</div>`)};

// ===== ADMIN: SKILLS =====
V.adminskills=async()=>{const sk=await api('/admin/skills');
  setMain(`<div class="page-header"><h1>Manage Skills</h1></div>
  <div class="card" style="margin-bottom:1rem"><form onsubmit="return addSkill(event)" style="display:flex;gap:.5rem;align-items:end">
  <label style="flex:1;margin:0">Add New Skill<input name=skillName placeholder="e.g. Docker" style="margin-top:.3rem"></label>
  <button class="btn btn-primary"><i class="fas fa-plus"></i> Add</button></form></div>
  <div class="scroll">${table(['Skill',''],sk.map(x=>[esc(x.skillName),`<button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="confirmModal('Delete Skill','Delete this skill?',()=>delSkill(${x.skillId}))"><i class="fas fa-trash"></i></button>`]))}</div>`)};
async function addSkill(e){const b=form(e);try{await api('/admin/skills',{method:'POST',body:b});toast('Skill added!','good');go('adminskills')}catch(x){toast(x.message,'bad')}return false}
async function delSkill(id){try{await api('/admin/skills/'+id,{method:'DELETE'});toast('Skill removed','good');go('adminskills')}catch(x){toast(x.message,'bad')}}

// ===== INIT =====
go('jobs');
