/* Supabase de mentira para o protótipo: guarda contas e dados só neste navegador.
   Imita as partes da API que o Mira usa (auth + from().select/update/insert/upsert),
   inclusive a regra de que aluno só vê os próprios dados e a professora vê todos. */
(function(){
 const K='mira_demo_db_v1';
 let mem=null;
 function load(){try{const v=localStorage.getItem(K);if(v)return JSON.parse(v);}catch(e){}return mem;}
 function put(d){mem=d;try{localStorage.setItem(K,JSON.stringify(d));}catch(e){}share.schedule();}
 function days(n){return new Date(Date.now()-n*86400000).toISOString();}
 function seed(){
  const d={users:[],profiles:[],student_data:[],session:null};
  function add(id,name,email,exams,teacher,sims,cls,hist,ago){
   d.users.push({id,email,password:'mira123',user_metadata:{name}});
   d.profiles.push({id,email,name,exams,is_teacher:!!teacher,created_at:days(ago+3)});
   d.student_data.push({user_id:id,sims:sims||[],state:{cls:cls||[],incid:{},hist:hist||{}},updated_at:days(ago)});
  }
  add('demo-prof','Professora (exemplo)','professora@exemplo.com',[],true,[],[],{},0);
  add('demo-julia','Júlia (exemplo)','julia@exemplo.com',[{name:'ENEM',date:'2026-11-08'},{name:'Einstein — Medicina',date:''}],false,
   [{date:'05/set',name:'Simulado ENEM 1',a:{'Biologia':[15,9],'Química':[15,7],'Física':[15,8],'Matemática':[45,27],'Português':[40,31]}},
    {date:'19/set',name:'Einstein 2025',a:{'Biologia':[5,3],'Química':[5,2],'Física':[5,3],'Matemática':[10,6],'Português':[10,9]}}],
   [{area:'Biologia',tema:'Genética',tipo:'conteudo',sub:'1ª lei de Mendel'},{area:'Biologia',tema:'Genética',tipo:'aplicacao',sub:null},
    {area:'Biologia',tema:'Ecologia',tipo:'interpretacao',sub:'cadeia alimentar'},{area:'Química',tema:'Química orgânica',tipo:'conteudo',sub:'isomeria'},
    {area:'Química',tema:'Química orgânica',tipo:'conteudo',sub:null},{area:'Química',tema:'Estequiometria',tipo:'aplicacao',sub:null},
    {area:'Física',tema:'Eletrodinâmica',tipo:'banca',sub:null},{area:'Matemática',tema:'Geometria plana',tipo:'aplicacao',sub:null},
    {area:'Matemática',tema:'Probabilidade',tipo:'atencao',sub:null},{area:'Matemática',tema:'Funções',tipo:'tempo',sub:null}],
   {'Biologia · ecologia':[{at:1,date:days(4)}]},1);
  add('demo-rafael','Rafael (exemplo)','rafael@exemplo.com',[{name:'Fuvest (USP)',date:'2026-11-22'},{name:'Unesp',date:''}],false,
   [{date:'12/set',name:'Fuvest 2024',a:{'Biologia':[10,4],'Química':[10,3],'Física':[10,5],'História':[10,6],'Matemática':[12,5]}}],
   [{area:'Química',tema:'Equilíbrio químico',tipo:'conteudo',sub:null},{area:'Biologia',tema:'Ecologia',tipo:'conteudo',sub:null},
    {area:'Matemática',tema:'Trigonometria',tipo:'aplicacao',sub:null}],{},9);
  add('demo-bia','Beatriz (exemplo)','beatriz@exemplo.com',[{name:'ENEM',date:'2026-11-08'}],false,[],[],{},2);
  put(d);return d;
 }
 function db(){return load()||seed();}
 const listeners=[];
 function emit(ev,s){listeners.forEach(f=>setTimeout(()=>f(ev,s),0));}
 function uid(){return 'u'+Math.random().toString(36).slice(2,10);}
 function sess(u){return{user:{id:u.id,email:u.email,user_metadata:u.user_metadata}};}
 const ok=data=>({data,error:null}), fail=m=>({data:null,error:{message:m}});
 class Q{
  constructor(t){this.t=t;this.f=[];this.op='select';this.single=false;}
  select(){return this;} eq(c,v){this.f.push([c,v]);return this;} maybeSingle(){this.single=true;return this;}
  update(p){this.op='update';this.p=p;return this;} insert(p){this.op='insert';this.p=p;return this;} upsert(p){this.op='upsert';this.p=p;return this;}
  then(res,rej){return new Promise(r=>setTimeout(()=>r(this.run()),60)).then(res,rej);}
  run(){
   const d=db();const me=d.session&&d.session.user.id;if(!me)return fail('not authenticated');
   const meP=d.profiles.find(p=>p.id===me);const teacher=!!(meP&&meP.is_teacher);
   const key=this.t==='profiles'?'id':'user_id';const rows=d[this.t];if(!rows)return fail('tabela desconhecida');
   const match=r=>this.f.every(([c,v])=>r[c]===v);
   if(this.op!=='select'){const me2=d.profiles.find(p=>p.id===me);if(me2&&!me2.is_teacher)me2._touched=true;}
   if(this.op==='select'){let r=JSON.parse(JSON.stringify(rows.filter(r=>(r[key]===me||teacher)&&match(r))));
    if(teacher&&!this.f.length)r=r.concat(share.rows(this.t));
    return ok(this.single?(r[0]||null):r);}
   if(this.op==='update'){if(this.t==='profiles'&&'is_teacher' in this.p)return fail('permission denied');
    const r=rows.filter(r=>r[key]===me&&match(r));r.forEach(x=>Object.assign(x,this.p,this.t==='student_data'?{updated_at:new Date().toISOString()}:{}));put(d);return ok(JSON.parse(JSON.stringify(r)));}
   const p=this.p;if(p[key]!==me)return fail('new row violates row-level security policy');
   const ex=rows.find(r=>r[key]===p[key]);
   if(ex&&this.op==='insert')return fail('duplicate key');
   const stamp=this.t==='student_data'?{updated_at:new Date().toISOString()}:{};
   if(ex)Object.assign(ex,p,stamp);else rows.push(Object.assign({},p,stamp));
   put(d);return ok(null);
  }
 }
 /* Compartilhamento: manda as contas de teste deste navegador para o armazenamento
    do artefato (testes/<id de quem testa>), e traz as dos outros navegadores para
    o painel da professora. Sem o armazenamento, tudo segue funcionando só aqui. */
 const share={
  cap:null,doc:null,remote:{},timer:null,busy:false,again:false,state:'off',
  setState(st){this.state=st;window.dispatchEvent(new CustomEvent('mira-share',{detail:st}));},
  rows(t){const out=[];Object.entries(this.remote).forEach(([who,v])=>{(v.accounts||[]).forEach(a=>{
    const id='outro:'+who+':'+a.profile.id;
    if(t==='profiles')out.push(Object.assign({},a.profile,{id,name:(a.profile.name||'(sem nome)')+' · outro navegador',is_teacher:false}));
    else out.push(Object.assign({},a.data,{user_id:id}));});});return JSON.parse(JSON.stringify(out));},
  payload(){const d=load()||{profiles:[],student_data:[]};
   const acc=d.profiles.filter(p=>!p.is_teacher&&(p._touched||!String(p.id).startsWith('demo-'))).map(p=>{
    const sd=d.student_data.find(x=>x.user_id===p.id)||{};
    return{profile:{id:p.id,email:p.email,name:p.name,exams:p.exams||[],created_at:p.created_at},
           data:{sims:sd.sims||[],state:sd.state||{},updated_at:sd.updated_at||null}};});
   return{accounts:acc,at:new Date().toISOString()};},
  schedule(){if(!this.doc){this.pending=true;return;}clearTimeout(this.timer);this.timer=setTimeout(()=>this.push(),1500);},
  async push(){if(!this.doc)return;if(this.busy){this.again=true;return;}
   const body=this.payload();if(!body.accounts.length&&!this.sent)return;
   this.busy=true;
   try{await this.doc.set(body);this.sent=true;this.setState('on');}
   catch(e){this.setState(e&&e.code==='invalid_argument'?'readonly':'error');}
   this.busy=false;if(this.again){this.again=false;this.push();}},
  async start(){
   try{
    if(!window.claude||typeof window.claude.use!=='function')return;
    const [cap,usr]=await Promise.all([window.claude.use('db'),window.claude.use('user')]);
    if(!cap)return;this.cap=cap;
    const id=usr?await usr.id():null;
    if(id){this.doc=cap.collection('testes').doc(id);this.setState('ready');if(this.pending){this.pending=false;this.schedule();}}
    cap.collection('testes').onSnapshot(snap=>{const r={};snap.docs.forEach(x=>{if(x.exists&&x.id!==id)r[x.id]=x.data();});
     this.remote=r;window.dispatchEvent(new CustomEvent('mira-remote'));},()=>{});
   }catch(e){}
  }
 };
 share.start();

 window.supabase={createClient(){return{
  from:t=>new Q(t),
  auth:{
   onAuthStateChange(f){listeners.push(f);setTimeout(()=>f('INITIAL_SESSION',db().session),0);return{data:{subscription:{unsubscribe(){}}}};},
   async signUp({email,password,options}){
    const d=db();email=String(email).toLowerCase();
    if(d.users.find(u=>u.email===email))return{data:{},error:{message:'User already registered'}};
    if(String(password).length<6)return{data:{},error:{message:'Password should be at least 6 characters'}};
    const name=(options&&options.data&&options.data.name)||'';
    const u={id:uid(),email,password,user_metadata:{name}};d.users.push(u);
    d.profiles.push({id:u.id,email,name,exams:[],is_teacher:false,created_at:new Date().toISOString()});
    d.student_data.push({user_id:u.id,sims:[],state:{},updated_at:new Date().toISOString()});
    d.session=sess(u);put(d);emit('SIGNED_IN',d.session);return{data:{session:d.session,user:u},error:null};
   },
   async signInWithPassword({email,password}){
    const d=db();email=String(email).toLowerCase();
    const u=d.users.find(u=>u.email===email&&u.password===password);
    if(!u)return{data:{},error:{message:'Invalid login credentials'}};
    d.session=sess(u);put(d);emit('SIGNED_IN',d.session);return{data:{session:d.session},error:null};
   },
   async signOut(){const d=db();d.session=null;put(d);emit('SIGNED_OUT',null);return{error:null};},
   async getSession(){return{data:{session:db().session}};},
   async resetPasswordForEmail(){return{error:null};},
   async updateUser(){return{error:null};}
  }}}};
 window.__miraDemo={
  reset(){try{localStorage.removeItem(K);}catch(e){}mem=null;},
  async loginAs(email){const d=db();const u=d.users.find(x=>x.email===email);if(!u)return;
   if(d.session){d.session=null;put(d);emit('SIGNED_OUT',null);await new Promise(r=>setTimeout(r,30));}
   const d2=db();d2.session=sess(u);put(d2);emit('SIGNED_IN',d2.session);}
 };
})();
