import{store,json,currentUser}from'./_common.mjs';
const depts=['CSE','IT','ECE','AEIE','EE','CE'];
const categories=['Previous Year Questions','Mid Semester Questions','Notes','Suggestions','Important Questions','Lab Materials','Syllabus','Assignments','Model Papers','Tutorials','Viva Questions','Other Academic Materials'];
const can=(u,d,a)=>u&&(u.role==='super_admin'||u.permissions?.[d]?.all||u.permissions?.[d]?.[a]);
export default async req=>{
  if(req.method==='GET'){
    const{blobs}=await store.list({prefix:'resources/'});const out=[];
    for(const b of blobs){const r=await store.get(b.key,{type:'json'});if(r)out.push(r)}
    return json({resources:out.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))})
  }
  const u=await currentUser(req);if(!u)return json({error:'Authentication required'},401);
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  const form=await req.formData(),file=form.get('file'),title=String(form.get('title')||'').trim(),department=String(form.get('department')||''),semester=Number(form.get('semester')),subject=String(form.get('subject')||'').trim(),category=String(form.get('category')||'').trim(),previewText=String(form.get('previewText')||'').trim();
  if(!(file instanceof File)||!title||!depts.includes(department)||semester<1||semester>8||!subject||!categories.includes(category))return json({error:'Missing or invalid resource fields.'},400);
  if(!can(u,department,'upload'))return json({error:'You do not have upload permission for this department.'},403);
  const id=crypto.randomUUID();const bytes=await file.arrayBuffer();
  await store.set(`files/${id}`,new Uint8Array(bytes),{metadata:{contentType:file.type||'application/octet-stream',name:file.name}});
  const resource={id,title,department,semester,subject,category,previewText:previewText.slice(0,700),fileName:file.name,fileKey:`files/${id}`,size:file.size,contentType:file.type||'application/octet-stream',uploadedBy:u.id,createdAt:new Date().toISOString()};
  await store.setJSON(`resources/${id}`,resource);
  const n={id:crypto.randomUUID(),title:`New ${category}`,message:`${title} is now available for ${department}, Semester ${semester}.`,audience:'department_semester',departments:[department],semesters:[semester],resourceId:id,createdAt:new Date().toISOString(),createdBy:u.id};
  await store.setJSON(`notifications/${n.id}`,n);
  return json({resource,notification:n},201)
};
export const config={path:'/api/resources'};
