// =============================================
//  SmartBolajon AI — script.js
// =============================================
const GROQ_API_KEY = "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";
const GROQ_MODEL = "llama-3.1-8b-instant";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// ===== STATE =====
let currentSubject = "Matematika";
let chatHistory = [];
let isLoading = false;
// quiz
let qQuestions = [], qIdx = 0, qCorr = 0, qWrong = 0, qDone = false;
// games
let memCards = [], memFlip = [], memMatch = [];
let mathAns = 0, mathSc = 0;
let wordLets = [], wordAns = "", wordFnd = "";
let spdSc = 0, spdTime = 30, spdTimer = null;
// stats
let msgCount = 0;

const ENC = [
  "Zo'r ish! 🌟","Ajoyib! 🎉","Sen aqlli bolasan! 🧠",
  "Barakalla! 👏","Juda zo'r! ⭐","Sen bilan faxrlanaman! 🏆",
  "Qoyil! 😍","Shunday davom et! 🔥","Yana bitta va medal olasan! 🎖️",
  "Sen eng zo'risan! 💪"
];
const LTRS = ["A","B","C","D"];
const WORLDS = ["Matematika","Ona tili","O'qish","Ingliz tili","Tabiatshunoslik","Science"];

// ===== INIT =====
document.addEventListener("DOMContentLoaded",()=>{
  loadData();
  refreshUI();
  checkDaily();
  setTimeout(()=>{
    const lo=document.getElementById("loadingOverlay");
    if(lo) lo.classList.add("hidden");
  },800);
  document.querySelectorAll(".btn-3d").forEach(b=>{
    b.addEventListener("click",()=>{
      if(Math.random()>0.6) miniConfetti();
    });
  });
});

// ===== DATA =====
function loadData(){
  const d = JSON.parse(localStorage.getItem("sb") || "{}");
  window.xp = d.xp || 0;
  window.streak = d.streak || 0;
  window.medals = d.medals || 0;
  window.lvl = d.lvl || 1;
  window.name = d.name || "Bolajon";
  window.quizLog = d.quizLog || [];
  window.chatCount = d.chatCount || 0;
  window.worldProg = d.worldProg || {};
  window.badges = d.badges || [];
}
function saveData(){
  localStorage.setItem("sb",JSON.stringify({
    xp:window.xp,streak:window.streak,medals:window.medals,
    lvl:window.lvl,name:window.name,quizLog:window.quizLog,
    chatCount:window.chatCount,worldProg:window.worldProg,
    badges:window.badges
  }));
}
function calcLevelInfo(xp){
  if(xp<100) return {lvl:1,cur:xp,next:100,pct:Math.round(xp/100*100),label:"Boshlang'ich",unlocked:1};
  if(xp<300) return {lvl:2,cur:xp-100,next:200,pct:Math.round((xp-100)/200*100),label:"O'rta",unlocked:2};
  if(xp<600) return {lvl:3,cur:xp-300,next:300,pct:Math.round((xp-300)/300*100),label:"Ilg'or",unlocked:3};
  return {lvl:4,cur:Math.min(xp-600,999),next:Infinity,pct:100,label:"Ustoz",unlocked:4};
}
function addXP(n){
  const oldLvl = calcLevelInfo(window.xp).lvl;
  window.xp += n;
  const info = calcLevelInfo(window.xp);
  window.lvl = info.lvl;
  if(info.lvl > oldLvl){
    window.medals++;
    window.badges.push("medal"+info.lvl);
    confetti();
    const titles = {2:"🔓 Qo'shimcha fanlar ochildi!",3:"🧩 Mantiqiy o'yinlar ochildi!",4:"🤖 AI erkin suhbat ochildi!"};
    showModal("🎉","Yangi daraja: "+info.lvl+"!","Endi sen "+info.lvl+" darajali o'quvchisan! "+ (titles[info.lvl]||""),"+ Yuqori daraja!");
  }
  saveData();refreshUI();
}
function refreshUI(){
  const e = id=>document.getElementById(id);
  const info = calcLevelInfo(window.xp);
  window.lvl = info.lvl;
  e("xpDisplay").textContent = window.xp;
  e("xpHome").textContent = window.xp;
  e("streakHome").textContent = window.streak;
  e("medalHome").textContent = window.medals;
  e("lvlHome").textContent = window.lvl;
  e("studentName").textContent = window.name;
  e("profileName").textContent = window.name;
  e("profileLevel").textContent = window.lvl+"-daraja ("+info.label+")";
  e("levelDisplayHome").textContent = window.lvl+"-daraja";
  const pct = Math.min(100, info.pct);
  e("xpFill").style.width = pct+"%";
  e("xpCurrent").textContent = window.xp;
  e("levelProgressFill").style.width = pct+"%";
  e("xpCurrentHome").textContent = window.xp;
  e("xpNextHome").textContent = info.next===Infinity ? "MAX" : info.next;
  if(e("xpNext")) e("xpNext").textContent = info.next===Infinity ? "MAX" : info.next;
  e("statChats").textContent = window.chatCount;
  e("statStreak").textContent = window.streak;
  const ql = window.quizLog;
  e("statQuizzes").textContent = ql.length;
  const totCorr = ql.reduce((s,q)=>s+(q.c||0),0);
  e("statCorrect").textContent = totCorr;
  renderBadges();
  renderWorlds();
  updateLocks(info.lvl);
  const today = new Date().toDateString();
  if(localStorage.getItem("daily_"+today)) e("dailyText").textContent = "✅ Bugun olindi!";
}
function updateLocks(lvl){
  const unlock = [
    {id:"lu2",need:2},{id:"lu3",need:3},{id:"lu4",need:4}
  ];
  unlock.forEach(u=>{
    const el=document.getElementById(u.id);
    if(!el) return;
    if(lvl >= u.need){el.classList.remove("locked");el.classList.add("unlocked")}
    else{el.classList.remove("unlocked");el.classList.add("locked")}
  });
  // Lock worlds
  const worlds = document.querySelectorAll(".world");
  worlds.forEach((w,i)=>{
    if(i>=2 && lvl<2) w.classList.add("locked");
    else if(i>=4 && lvl<3) w.classList.add("locked");
    else w.classList.remove("locked");
  });
  // Lock games
  const games = document.querySelectorAll(".game-card");
  games.forEach((g,i)=>{
    if(i>=2 && lvl<2) g.classList.add("locked");
    else if(i>=3 && lvl<3) g.classList.add("locked");
    else g.classList.remove("locked");
  });
}
function renderBadges(){
  const row = document.getElementById("badgesRow");
  if(!row) return;
  const all = window.badges || [];
  row.innerHTML = "";
  for(let i=0;i<5;i++){
    const d = document.createElement("div");
    if(i < all.length){
      d.className = "badge";
      d.textContent = "🏅";
      d.title = "Medal #"+(i+1);
    }else{
      d.className = "badge empty";
      d.textContent = "?";
    }
    row.appendChild(d);
  }
}
function renderWorldStats(){
  const el=document.getElementById("worldStats");
  if(!el) return;
  el.innerHTML="";
  const icons={Matematika:"🏰", "Ona tili":"🌲", "O'qish":"📚", "Ingliz tili":"🇬🇧", Tabiatshunoslik:"🌍", Science:"🔬"};
  WORLDS.forEach(w=>{
    const prog=window.worldProg[w]||0;
    const d=document.createElement("div");d.className="world-stat-item";
    d.innerHTML=`<span class="ws-icon">${icons[w]||"📖"}</span><span class="ws-name">${w}</span><div class="ws-bar"><div class="ws-fill" style="width:${prog}%"></div></div><span class="ws-pct">${prog}%</span>`;
    el.appendChild(d);
  });
}
function renderWorlds(){
  renderWorldStats();
  WORLDS.forEach(w=>{
    const key = w.toLowerCase().replace(/ /g,"").replace(/'/g,"");
    const prog = window.worldProg[w] || 0;
    const el1 = document.getElementById("wp-"+key);
    const el2 = document.getElementById("pct-"+key);
    if(el1) el1.style.width = prog+"%";
    if(el2) el2.textContent = prog+"%";
  });
}

// ===== PAGES =====
function showPage(p){
  document.querySelectorAll(".page").forEach(el=>el.classList.remove("active"));
  const pg = document.getElementById("page-"+p);
  if(pg) pg.classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
  const btn = document.querySelector(`.nav-btn[data-page="${p}"]`);
  if(btn) btn.classList.add("active");
  if(p==="chat") setTimeout(()=>{const i=document.getElementById("chatInput");if(i)i.focus()},300);
  if(p==="home") updateMascotMsg();
}

// ===== MASCOT =====
function updateMascotMsg(){
  const msgs = [
    "Salom! Bugun nima o'rganamiz? 😊",
    "Keling, bilimlar olamiga sayohat qilamiz! 🚀",
    "Sen bugun ajoyib ishlading! 🌟",
    "Yangi bilimlar senga intiqlik bilan kutmoqda! 📚",
    "Matematika, til, tabiat... hammasi qiziqarli! 🎯",
  ];
  document.getElementById("heroSpeech").textContent = msgs[Math.floor(Math.random()*msgs.length)];
}

// ===== CHAT =====
function sysPrompt(){
  const eng = currentSubject==="Ingliz tili"||currentSubject==="Science";
  return `Sen SmartBolajon AI — O'zbekiston 1-4 sinf o'quvchilari uchun AI o'qituvchisan.
Vazifang: fanlarni SODDA, QIZIQARLI va TUSHUNARLI tilda tushuntirish.
Har bir javobing mazmunli va bolaning yoshiga mos bo'lsin.
Mavzuni qadamma-qadam tushuntir, hayotiy misollar keltir.
Har bir tushuntirishdan keyin bitta sodda savol ber.
Bolani tez-tez maqtab rag'batlantir: "Zo'r ish!", "Ajoyib!", "Barakalla!"
Xato qilsa: "Hechqisi yo'q, yana urinib ko'ramiz!" deb qo'llab-quvvatla.
Javoblar 4-5 qatordan oshmasin.
${eng ? "Ingliz tilida gapir, oddiy so'zlar bilan." : "O'zbek tilida gapir."}
Fan: ${currentSubject} | 1-4 sinf.`;
}

async function sendChat(){
  if(isLoading) return;
  const inp = document.getElementById("chatInput");
  const txt = inp.value.trim();
  if(!txt) return;
  inp.value="";inp.style.height="auto";
  addMsg(txt,"user");
  isLoading=true;
  const tid = addTypingDots();
  try{
    chatHistory.push({role:"user",content:txt});
    const r = await fetch(GROQ_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+GROQ_API_KEY},
      body:JSON.stringify({model:GROQ_MODEL,max_tokens:1024,temperature:0.7,messages:[{role:"system",content:sysPrompt()},...chatHistory]})
    });
    if(!r.ok){const e=await r.json();throw new Error(e.error?.message||"Xatolik")}
    const d=await r.json();
    const reply=d.choices[0].message.content;
    chatHistory.push({role:"assistant",content:reply});
    if(chatHistory.length>20) chatHistory=chatHistory.slice(-20);
    rmTyping(tid);
    addMsg(reply,"ai");
    window.chatCount++; addXP(3);
  }catch(e){
    rmTyping(tid);
    addMsg("Xatolik: "+e.message+". Qayta urun!","error");
  }
  isLoading=false;
}
function addMsg(t,type){
  const box=document.getElementById("chatMessages");
  const d=document.createElement("div");
  d.className="msg "+(type==="user"?"user":"ai");
  const a=document.createElement("div");
  a.className="msg-avatar "+(type==="user"?"user-av":"ai-av");
  if(type==="user"){
    a.textContent="🧒";
  }else{
    const aiImg=document.createElement("img");
    aiImg.src="https://i.ibb.co/SwkCVRc9/580077c1-8358-4fe3-92ff-e50548ea6ff6.png";
    aiImg.style.cssText="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block";
    a.style.overflow="hidden";
    a.textContent="";
    a.appendChild(aiImg);
  }
  const b=document.createElement("div");
  b.className="msg-bubble";
  if(type==="error"){b.style.background="#f8d7da";b.style.color="#721c24"}
  b.innerHTML=t.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br>");
  d.appendChild(a);d.appendChild(b);box.appendChild(d);
  box.scrollTop=box.scrollHeight;
}
function addTypingDots(){
  const box=document.getElementById("chatMessages");const id="t-"+Date.now();
  const d=document.createElement("div");d.className="msg ai";d.id=id;
  d.innerHTML=`<div class="msg-avatar ai-av" style="overflow:hidden"><img src="https://i.ibb.co/SwkCVRc9/580077c1-8358-4fe3-92ff-e50548ea6ff6.png" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block"></div><div class="msg-bubble"><span class="typing">O'ylayapman<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span></div>`;
  box.appendChild(d);box.scrollTop=box.scrollHeight;return id;
}
function rmTyping(id){const e=document.getElementById(id);if(e)e.remove()}
function clearChat(){
  chatHistory=[];
  document.getElementById("chatMessages").innerHTML=
    `<div class="msg ai"><div class="msg-avatar ai-av" style="overflow:hidden"><img src="https://i.ibb.co/SwkCVRc9/580077c1-8358-4fe3-92ff-e50548ea6ff6.png" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block"></div><div class="msg-bubble">Chat tozalandi! 😊 Yangi savollar bering!</div></div>`;
}
function switchChatSubject(s){
  currentSubject=s;
  document.getElementById("chatSubject").textContent=s;
  const cm=document.getElementById("chatMascot");
  const cmi=document.querySelector(".chat-mascot-img");
  if(cmi) cmi.style.display=s==="Ingliz tili"||s==="Science"?"none":"block";
  if(cm) cm.textContent=s==="Ingliz tili"?"🌐":s==="Science"?"🔬":"";
  clearChat();showPage("chat");
}
function handleChatKey(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat()}}
function autoResize(el){el.style.height="auto";el.style.height=Math.min(el.scrollHeight,80)+"px"}

// ===== WORLD / SUBJECT ENTRY =====
function enterWorld(s){
  currentSubject=s;
  showPage("chat");
  document.getElementById("chatSubject").textContent=s;
  const cm=document.getElementById("chatMascot");
  const cmi=document.querySelector(".chat-mascot-img");
  if(cmi) cmi.style.display="block";
  if(cm) cm.textContent="";
  const welcomes = {
    "Matematika":"🏰 Matematika Qirolligiga xush kelibsiz! Sonlar va misollar bilan tanishamiz!",
    "Ona tili":"🌲 Ona tili O'rmoniga xush kelibsiz! Harflar va so'zlar olami!",
    "O'qish":"📚 O'qish Shahriga xush kelibsiz! Qiziqarli hikoyalar!",
    "Ingliz tili":"🇬🇧 Welcome to English City! Let's learn English!",
    "Tabiatshunoslik":"🌍 Tabiat Sayyorasiga xush kelibsiz! Tabiat sirlari!",
    "Science":"🔬 Welcome to Science Lab! Fun experiments await!"
  };
  addMsg(welcomes[s] || s+"ga xush kelibsiz!","ai");
}

// ===== QUIZ =====
async function startQuiz(sub){
  currentSubject=sub;
  showPage("chat");
  document.getElementById("chatSubject").textContent="🧠 "+sub+" test";
  const cm=document.getElementById("chatMascot");
  const cmi=document.querySelector(".chat-mascot-img");
  if(cmi) cmi.style.display="none";
  if(cm) cm.textContent="🧠";
  addMsg("Test tayyorlanmoqda... bir soniya ⏳","ai");
  const tid=addTypingDots();
  try{
    const prompt = sub==="Ingliz tili"||sub==="Science"
      ? `Create 5 simple multiple choice quiz questions for ${sub} for grades 1-4. Use very simple English. Format each line as: QUESTION|A) opt1|B) opt2|C) opt3|D) opt4|CORRECT_LETTER`
      : `${sub} fanidan 1-4 sinf uchun 5 ta oson test savoli tuz. Format: SAVOL|A) var1|B) var2|C) var3|D) var4|TOGRI_HARF`;
    const r = await fetch(GROQ_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+GROQ_API_KEY},
      body:JSON.stringify({model:GROQ_MODEL,max_tokens:1024,temperature:0.7,messages:[{role:"system",content:"Sen 1-4 sinf uchun test tuzuvchisan. Faqat format bo'yicha, qo'shimcha yozma."},{role:"user",content:prompt}]})
    });
    if(!r.ok) throw new Error("API xatosi");
    const d=await r.json();
    const lines = d.choices[0].message.content.split("\n").filter(l=>l.trim());
    qQuestions = lines.map(l=>{
      const p=l.split("|").map(x=>x.trim());
      if(p.length<6) return null;
      return {q:p[0],o:p.slice(1,5).map(x=>x.replace(/^[A-D]\)\s*/,"")),c:p[5].toUpperCase()};
    }).filter(x=>x);
    rmTyping(tid);
    if(qQuestions.length<3){addMsg("Testlar yetarli emas. Qayta urun.","error");return;}
    qIdx=0;qCorr=0;qWrong=0;qDone=false;
    showQuizQ();
  }catch(e){
    rmTyping(tid);
    addMsg("Xatolik: "+e.message,"error");
  }
}
function showQuizQ(){
  if(qIdx>=qQuestions.length){showQuizRes();return;}
  const q=qQuestions[qIdx];
  let html = "**"+(qIdx+1)+"/"+qQuestions.length+". "+q.q+"**\n\n";
  q.o.forEach((o,i)=>{html += "**"+LTRS[i]+")** "+o+"\n";});
  html += "\n✅ *Javobingizni yozing (A, B, C yoki D)*";
  addMsg(html,"ai");
}
window.lastAnswer = "";
function handleQuiz(){
  // handled via chat input - user types A/B/C/D
}
document.addEventListener("DOMContentLoaded",()=>{
  // override sendChat for quiz mode
  const origSend = sendChat;
  const inp = document.getElementById("chatInput");
  if(inp){
    inp.addEventListener("keydown",(e)=>{
      if(e.key==="Enter"&&!e.shiftKey){
        e.preventDefault();
        const txt = inp.value.trim().toUpperCase();
        if(qQuestions.length>0 && qIdx<qQuestions.length && (txt==="A"||txt==="B"||txt==="C"||txt==="D")){
          inp.value="";handleQuizAnswer(txt);return;
        }
        sendChat();
      }
    });
  }
});
function handleQuizAnswer(sel){
  if(qDone) return;
  const q=qQuestions[qIdx];
  const corr = q.c;
  if(sel===corr){
    qCorr++;
    addXP(10);
    const msg = ENC[Math.floor(Math.random()*ENC.length)];
    addMsg("✅ **To'g'ri!** "+msg,"user");
    confetti();
  }else{
    qWrong++;
    addMsg("❌ **Noto'g'ri.** To'g'ri javob: **"+corr+")** "+q.o[LTRS.indexOf(corr)],"user");
  }
  qDone=true;
  setTimeout(()=>{qIdx++;qDone=false;showQuizQ()},1200);
}
function showQuizRes(){
  const total = qCorr+qWrong;
  const pct = total>0 ? Math.round(qCorr/total*100) : 0;
  let msg = "**📊 Test natijasi:**\n\n✅ To'g'ri: "+qCorr+"\n❌ Noto'g'ri: "+qWrong+"\n📈 Foiz: "+pct+"%\n\n";
  if(pct>=80){msg += "🏆 **Ajoyib natija!** Sen matematika bo'yicha zo'rsan!"; addXP(30);confetti();showModal("🏆","Ajoyib!","Testda "+pct+"% to'g'ri javob berding!","+30 XP");}
  else if(pct>=50){msg += "👍 **Yaxshi!** Yana bir oz mashq qilaylik!"; addXP(15);}
  else{msg += "💪 **Barakalla!** Qayta urin, albatta yaxshiroq bo'ladi!"; addXP(5);}
  // update world progress
  const w = window.worldProg[currentSubject] || 0;
  const newP = Math.min(100, w + Math.round(pct/5));
  window.worldProg[currentSubject] = newP;
  // log quiz
  window.quizLog.push({s:currentSubject,c:qCorr,w:qWrong,t:new Date().toISOString()});
  if(window.quizLog.length>100) window.quizLog=window.quizLog.slice(-100);
  saveData();refreshUI();
  addMsg(msg+"\n\nYangi test? **Ha** yoki **Yo'q** deb yozing.","ai");
  qQuestions=[];
  // handle response
}

// ===== DAILY =====
function checkDaily(){
  const today = new Date().toDateString();
  const last = localStorage.getItem("lastDaily");
  if(last && last!==today){
    const yest = new Date(Date.now()-86400000).toDateString();
    if(last===yest) window.streak++;
    else window.streak=1;
  }
  localStorage.setItem("lastDaily",today);
  saveData();refreshUI();
}
function claimDaily(){
  const today = new Date().toDateString();
  if(localStorage.getItem("daily_"+today)){showModal("🎁","Alloqachon olgansiz!","Ertaga yana sovg'a bor! 😊","");return;}
  localStorage.setItem("daily_"+today,"1");
  const bonus = 20 + window.streak * 5;
  addXP(bonus);
  window.streak++;
  saveData();refreshUI();
  confetti();
  showModal("🎁","Kunlik sovg'a!","+"+bonus+" XP! Ertaga yana kel! 🔥","+"+bonus+" XP");
  document.getElementById("dailyText").textContent = "✅ Bugun olindi!";
}

// ===== GAMES =====
function playGame(t){
  document.getElementById("gameArea").style.display="block";
  if(t==="math") startMath();
  else if(t==="memory") startMem();
  else if(t==="word") startWord();
  else if(t==="speed") startSpeed();
}
function startMath(){
  mathSc=0;
  document.getElementById("gameArea").innerHTML=`
    <div class="math-game">
      <div class="math-score">⭐ <span id="mathSc">0</span></div>
      <div class="math-q" id="mathQ">5 + 3 = ?</div>
      <input class="math-input" id="mathInp" type="number" placeholder="?" onkeydown="if(event.key==='Enter')checkMath()">
      <br><br>
      <button class="hero-btn primary" onclick="checkMath()" style="font-size:14px;padding:10px 24px">✅ Tekshir</button>
    </div>`;
  genMathQ();
  setTimeout(()=>document.getElementById("mathInp").focus(),100);
}
function genMathQ(){
  const a=Math.floor(Math.random()*20)+1;
  const b=Math.floor(Math.random()*a)+1;
  const ops=["+","-"];const op=ops[Math.floor(Math.random()*2)];
  document.getElementById("mathQ").textContent = a+" "+op+" "+b+" = ?";
  mathAns = op==="+" ? a+b : a-b;
}
function checkMath(){
  const v=parseInt(document.getElementById("mathInp").value);
  if(v===mathAns){mathSc++;addXP(5);document.getElementById("mathSc").textContent=mathSc;confetti();}
  else{alert("Noto'g'ri. Javob: "+mathAns+". Yana urun! 💪");}
  document.getElementById("mathInp").value="";genMathQ();document.getElementById("mathInp").focus();
}
function startMem(){
  const em = ["🐶","🐱","🐼","🐸","🦊","🐰","🐯","🦁"];
  const colors = ["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD","#98D8C8","#F7DC6F"];
  const cardObjs = em.map((e,i)=>({emoji:e,color:colors[i],label:"Smart Bolajon"}));
  const cs = [...cardObjs,...cardObjs];
  for(let i=cs.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cs[i],cs[j]]=[cs[j],cs[i]];}
  memCards=cs;memFlip=[];memMatch=[];
  document.getElementById("gameArea").innerHTML=`
    <div style="text-align:center;font-weight:700;margin-bottom:8px">🧩 Juftlikni top! <span id="memSc">0/8</span></div>
    <div class="memory-grid" id="memGrid"></div>`;
  const g=document.getElementById("memGrid");
  cs.forEach((e,i)=>{
    const d=document.createElement("div");
    d.className="memory-card";d.dataset.idx=i;
    d.innerHTML='<div class="mem-inner"><div class="mem-front">❓</div><div class="mem-back" style="background:'+e.color+'"><span class="mem-emoji">'+e.emoji+'</span><span class="mem-label">Smart Bolajon</span></div></div>';
    d.onclick=()=>flipCard(i);
    g.appendChild(d);
  });
}
function flipCard(i){
  if(memFlip.length>=2||memMatch.includes(i)||memFlip.includes(i)) return;
  const cs=document.querySelectorAll(".memory-card");
  cs[i].classList.add("flipped");
  memFlip.push(i);
  if(memFlip.length===2){
    const [a,b]=memFlip;
    if(memCards[a].emoji===memCards[b].emoji){
      memMatch.push(a,b);
      cs[a].classList.add("matched");cs[b].classList.add("matched");
      memFlip=[];addXP(3);
      document.getElementById("memSc").textContent=memMatch.length/2+"/8";
      if(memMatch.length===16){addXP(15);confetti();showModal("🎉","Yutding!","Barcha juftliklarni topding!","+15 XP");}
    }else{
      setTimeout(()=>{
        if(!memMatch.includes(a))cs[a].classList.remove("flipped");
        if(!memMatch.includes(b))cs[b].classList.remove("flipped");
        memFlip=[];
      },700);
    }
  }
}
function startWord(){
  const ws=[{w:"OLMA",h:"Qizil, sariq meva"},{w:"KITOB",h:"Bilim manbai"},{w:"QALAM",h:"Chizish uchun"},{w:"BOG'",h:"Gullar o'sadigan joy"},{w:"SUT",h:"Oq ichimlik"},{w:"BALIQ",h:"Suvda yashaydi"},{w:"GUL",h:"Chiroyli hidli o'simlik"},{w:"OYNAK",h:"Ko'zoynak yoki oynalar"},{w:"SHAR",h:"Havo bilan to'ldirilgan"},{w:"NON",h:"Nonushta qilamiz"}];
  const p=ws[Math.floor(Math.random()*ws.length)];
  wordAns=p.w;const l=p.w.split("");for(let i=l.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[l[i],l[j]]=[l[j],l[i]];}
  wordLets=l;wordSelOrder=[];
  document.getElementById("gameArea").innerHTML=`
    <div class="word-game">
      <div class="word-hint">🗝️ ${p.h}</div>
      <div class="word-answer" id="wAns"><span style="color:var(--text2)">Harflarni bosing...</span></div>
      <div class="word-slots" id="wSlots"></div>
      <div class="word-letters" id="wLets"></div>
      <div style="margin-top:10px;display:flex;gap:8px;justify-content:center">
        <button class="hero-btn primary" style="font-size:14px;padding:8px 20px" onclick="checkWord()">✅ Tekshir</button>
        <button class="hero-btn ghost" style="font-size:14px;padding:8px 20px;background:var(--grad-accent);color:var(--text)" onclick="startWord()">🔄 Yangi</button>
      </div>
    </div>`;
  // Build slots
  const slotsEl=document.getElementById("wSlots");
  p.w.split("").forEach((_,i)=>{
    const d=document.createElement("div");d.className="word-slot";d.dataset.slotIdx=i;d.textContent="_";
    slotsEl.appendChild(d);
  });
  // Build letter buttons
  const c=document.getElementById("wLets");
  wordLets.forEach((l,i)=>{
    const d=document.createElement("div");d.className="word-letter";d.textContent=l;d.dataset.idx=i;
    d.onclick=function(){toggleWordLetter(+this.dataset.idx)};
    c.appendChild(d);
  });
}
function toggleWordLetter(idx){
  const pos=wordSelOrder.indexOf(idx);
  const letters=document.querySelectorAll(".word-letter");
  const slots=document.querySelectorAll(".word-slot");
  if(pos===-1){
    wordSelOrder.push(idx);
    letters[idx].classList.add("used");
  }else{
    wordSelOrder.splice(pos,1);
    letters[idx].classList.remove("used");
  }
  wordSelOrder.forEach((selIdx,i)=>{
    if(slots[i]){slots[i].textContent=wordLets[selIdx];slots[i].classList.add("filled")}
  });
  for(let i=wordSelOrder.length;i<slots.length;i++){
    if(slots[i]){slots[i].textContent="_";slots[i].classList.remove("filled")}
  }
  document.getElementById("wAns").innerHTML="<span style='color:var(--text2)'>"+wordSelOrder.map(i=>wordLets[i]).join(" ").toLowerCase()+"</span>";
}
function checkWord(){
  const typed=wordSelOrder.map(i=>wordLets[i]).join("");
  if(typed===wordAns){addXP(8);confetti();showModal("🎉","Topding!","So'z: "+wordAns,"+8 XP");}
  else{alert("❌ Noto'g'ri! Yana urun! 💪");}
}
function startSpeed(){
  spdSc=0;spdTime=30;clearInterval(spdTimer);
  document.getElementById("gameArea").innerHTML=`
    <div class="speed-game">
      <div class="speed-top">
        <div class="speed-score">⭐ <span id="spdSc">0</span></div>
        <div class="speed-timer">⏱️ <span id="spdTm">30</span>s</div>
      </div>
      <div class="speed-q" id="spdQ"></div>
      <div class="speed-opts" id="spdOpts"></div>
    </div>`;
  nextSpdQ();
  spdTimer=setInterval(()=>{
    spdTime--;document.getElementById("spdTm").textContent=spdTime;
    if(spdTime<=0){
      clearInterval(spdTimer);
      document.getElementById("spdOpts").innerHTML="";
      document.getElementById("spdQ").textContent="⏰ Vaqt tugadi!";
      const xp = Math.floor(spdSc*2);
      addXP(xp);confetti();
      showModal("⏰","O'yin tugadi!",spdSc+" ta to'g'ri javob!","+"+xp+" XP");
    }
  },1000);
}
function nextSpdQ(){
  if(spdTime<=0) return;
  const a=Math.floor(Math.random()*12)+1,b=Math.floor(Math.random()*12)+1;
  const op=["+","-"][Math.floor(Math.random()*2)];
  const ans=op==="+"?a+b:a-b;
  document.getElementById("spdQ").innerHTML='<span class="spd-num">'+a+'</span> <span class="spd-op">'+(op==="+"?"➕":"➖")+'</span> <span class="spd-num">'+b+'</span> <span class="spd-op">=</span> <span class="spd-num">?</span>';
  const opts=[ans];while(opts.length<4){const r=ans+Math.floor(Math.random()*10)-5;if(!opts.includes(r)&&r>=0)opts.push(r)}
  for(let i=opts.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[opts[i],opts[j]]=[opts[j],opts[i]];}
  window.spdAns=ans;
  const c=document.getElementById("spdOpts");c.innerHTML="";
  opts.forEach(o=>{
    const b=document.createElement("button");b.className="speed-btn";b.textContent=o;
    b.onclick=()=>{
      if(spdTime<=0) return;
      if(o===window.spdAns){spdSc++;addXP(2);document.getElementById("spdSc").textContent=spdSc;nextSpdQ();}
      else{document.getElementById("spdQ").innerHTML='<span style="font-size:48px;color:#ff4444">❌</span>';setTimeout(nextSpdQ,400)}
    };
    c.appendChild(b);
  });
}

// ===== CONFETTI =====
function confetti(){
  const c=document.getElementById("confettiContainer");c.innerHTML="";
  const colors=["#4A90D9","#34C759","#FFCC00","#FF6B6B","#A18CD1","#FF9500"];
  for(let i=0;i<50;i++){
    const d=document.createElement("div");d.className="confetti-piece";
    d.style.left=Math.random()*100+"%";
    d.style.background=colors[Math.floor(Math.random()*colors.length)];
    d.style.width=(Math.random()*6+4)+"px";
    d.style.height=(Math.random()*6+4)+"px";
    d.style.borderRadius=Math.random()>0.5?"50%":"2px";
    d.style.animationDuration=(Math.random()*2+1.5)+"s";
    d.style.animationDelay=(Math.random()*0.5)+"s";
    c.appendChild(d);
  }
  setTimeout(()=>c.innerHTML="",3500);
}

function miniConfetti(){
  const c=document.getElementById("confettiContainer");c.innerHTML="";
  const colors=["#4A90D9","#FFCC00","#A855F7","#FF6B6B","#34C759","#FF9500"];
  for(let i=0;i<15;i++){
    const d=document.createElement("div");d.className="confetti-piece";
    d.style.left=Math.random()*100+"%";
    d.style.background=colors[Math.floor(Math.random()*colors.length)];
    d.style.width=(Math.random()*5+3)+"px";
    d.style.height=(Math.random()*5+3)+"px";
    d.style.borderRadius=Math.random()>0.5?"50%":"2px";
    d.style.animationDuration=(Math.random()*1.5+1)+"s";
    c.appendChild(d);
  }
  setTimeout(()=>c.innerHTML="",2500);
}

// ===== MODAL =====
function showModal(emoji,title,sub,xp){
  document.getElementById("celebEmoji").textContent=emoji;
  document.getElementById("celebTitle").textContent=title;
  document.getElementById("celebSub").textContent=sub||"";
  document.getElementById("celebXP").textContent=xp||"";
  document.getElementById("celebrationModal").style.display="flex";
  setTimeout(()=>document.getElementById("celebrationModal").style.display="none",3500);
}

// ===== PARENT DASHBOARD =====
function updateParentDash(){
  const ql = window.quizLog||[];
  const week = ql.filter(q=>{
    const d=new Date(q.t);const now=new Date();
    return (now-d)<7*86400000;
  });
  const total = week.length;
  const corr = week.reduce((s,q)=>s+(q.c||0),0);
  const wrong = week.reduce((s,q)=>s+(q.w||0),0);
  const pct = total>0?Math.round(corr/(corr+wrong)*100):0;
  document.getElementById("weeklyReport").innerHTML = total>0
    ? `📅 ${total} ta test<br>✅ ${corr} to'g'ri<br>❌ ${wrong} noto'g'ri<br>📈 ${pct}%`
    : "Hali test ishlanmagan";
  // strengths
  const bySub = {};
  ql.forEach(q=>{
    if(!bySub[q.s]) bySub[q.s]={c:0,w:0};
    bySub[q.s].c+=q.c||0;bySub[q.s].w+=q.w||0;
  });
  const sorted = Object.entries(bySub).sort((a,b)=> (b[1].c/(b[1].c+b[1].w||1)) - (a[1].c/(a[1].c+a[1].w||1)));
  document.getElementById("strengths").innerHTML = sorted.length>0
    ? sorted.slice(0,2).map(([s,v])=>`✅ ${s}: ${Math.round(v.c/(v.c+v.w||1)*100)}%`).join("<br>")
    : "Hali ma'lumot yo'q";
  document.getElementById("weaknesses").innerHTML = sorted.length>1
    ? sorted.slice(-2).map(([s,v])=>`📚 ${s}: ${Math.round(v.c/(v.c+v.w||1)*100)}%`).join("<br>")
    : "Ko'proq test ishlang!";
  // recommendations
  const weak = sorted[sorted.length-1];
  document.getElementById("recommendations").innerHTML = weak
    ? `🎯 <b>${weak[0]}</b> faniga ko'proq vaqt ajrating.<br>📖 Kuniga 10 daqiqa mashq qiling!`
    : "Turli fanlardan test ishlashni boshlang!";
  // study time (fake - tracks chats)
  const mins = Math.round((window.chatCount||0) * 1.5);
  document.getElementById("studyTime").textContent = `📊 Bugun: ${mins} daqiqa`;
}

// override showPage to update parents and profile
const origShow = showPage;
showPage = function(p){
  origShow(p);
  if(p==="parents") updateParentDash();
  if(p==="profile") renderWorldStats();
};