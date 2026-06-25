// =============================================
//  SmartBolajon AI — Telegram Bot (bot.js)
// =============================================
require("dotenv").config();

const BOT_TOKEN = process.env.BOT_TOKEN || "8789313294:AAH18HLd3y3NufEWmpvxD_ztwgg8iYfRsgo";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "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";
const GROQ_MODEL = "llama-3.1-8b-instant";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const fs = require("fs");
const path = require("path");
const http = require("http");
const { Telegraf, Markup } = require("telegraf");

const bot = new Telegraf(BOT_TOKEN);
const DATA_FILE = path.join(__dirname, "users.json");

// ===== DATA LAYER =====
function loadUsers() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }
  } catch (e) { /* ignore */ }
  return {};
}

function saveUsers(users) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

function getUser(id) {
  const users = loadUsers();
  if (!users[id]) {
    users[id] = {
      name: "",
      xp: 0, lvl: 1, medals: 0, streak: 0,
      quizLog: [], chatCount: 0, worldProg: {},
      lastDaily: "", lastSeen: "", badges: []
    };
    saveUsers(users);
  }
  return users[id];
}

function updateUser(id, data) {
  const users = loadUsers();
  users[id] = { ...users[id], ...data };
  saveUsers(users);
}

// ===== XP & LEVELS =====
const ENC = [
  "Zo'r ish! 🌟", "Ajoyib! 🎉", "Sen aqlli bolasan! 🧠",
  "Barakalla! 👏", "Juda zo'r! ⭐", "Sen bilan faxrlanaman! 🏆",
  "Qoyil! 😍", "Shunday davom et! 🔥", "Yana bitta va medal olasan! 🎖️"
];
const SUBJECTS = ["Matematika", "Ona tili", "O'qish", "Ingliz tili", "Tabiatshunoslik", "Science"];
const SUBJ_ICONS = { "Matematika": "📐", "Ona tili": "📖", "O'qish": "📚", "Ingliz tili": "🌐", "Tabiatshunoslik": "🌿", "Science": "🔬" };

function addXP(userId, n) {
  const user = getUser(userId);
  const need = user.lvl * 80;
  user.xp += n;
  let leveledUp = false;
  while (user.xp >= need) {
    user.xp -= need;
    user.lvl++;
    user.medals++;
    user.badges.push("medal" + user.lvl);
    leveledUp = true;
  }
  user.lastSeen = new Date().toISOString();
  updateUser(userId, user);
  return { leveledUp, newLevel: user.lvl, totalXP: user.xp };
}

// ===== GROQ AI =====
async function askGroq(messages) {
  const resp = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + GROQ_API_KEY },
    body: JSON.stringify({ model: GROQ_MODEL, max_tokens: 1024, temperature: 0.7, messages })
  });
  if (!resp.ok) { const e = await resp.json(); throw new Error(e.error?.message || "Xatolik"); }
  const d = await resp.json();
  return d.choices[0].message.content;
}

// ===== SUBJECT KEYBOARD =====
function subjectKeyboard() {
  const rows = [];
  for (let i = 0; i < SUBJECTS.length; i += 2) {
    rows.push([
      Markup.button.callback(SUBJ_ICONS[SUBJECTS[i]] + " " + SUBJECTS[i], "subj_" + SUBJECTS[i]),
      Markup.button.callback(SUBJ_ICONS[SUBJECTS[i + 1]] + " " + SUBJECTS[i + 1], "subj_" + SUBJECTS[i + 1])
    ]);
  }
  return Markup.inlineKeyboard(rows);
}

function mainKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📚 Fanlar", "menu_subjects"),
     Markup.button.callback("🧠 Test", "menu_quiz")],
    [Markup.button.callback("🎮 O'yinlar", "menu_games"),
     Markup.button.callback("⭐ Profil", "menu_profile")],
    [Markup.button.callback("🎁 Kunlik sovg'a", "menu_daily"),
     Markup.button.callback("💬 AI bilan suhbat", "menu_chat")]
  ]);
}

// ===== /START =====
bot.start(async (ctx) => {
  const userId = String(ctx.from.id);
  const name = ctx.from.first_name || "Bolajon";
  const user = getUser(userId);
  user.name = name;
  updateUser(userId, user);

  await ctx.replyWithMarkdown(
    `🧑‍🎓 *SmartBolajon AI* ga xush kelibsiz, ${name}! 🌟\n\n`
    + `Men sizning AI ustozingizman. Keling, bilimlar olamiga sayohat qilamiz! 🚀\n\n`
    + `📐 *Matematika* \\| 📖 *Ona tili* \\| 🌐 *Ingliz tili*\n`
    + `📚 *O'qish* \\| 🌿 *Tabiatshunoslik* \\| 🔬 *Science*\n\n`
    + `Pastdagi tugmalardan birini tanlang! 👇`,
    mainKeyboard()
  );
});

// ===== MENU HANDLERS =====
bot.action("menu_subjects", async (ctx) => {
  await ctx.editMessageText("📚 *Fanlar*\n\nQaysi fanini o'rganmoqchisiz?", {
    parse_mode: "Markdown", ...subjectKeyboard()
  }).catch(() => ctx.replyWithMarkdown("📚 *Fanlar*", subjectKeyboard()));
});

bot.action("menu_quiz", async (ctx) => {
  await ctx.editMessageText("🧠 *Test*\n\nQaysi fandan test topshirishni xohlaysiz?", {
    parse_mode: "Markdown", ...subjectKeyboard()
  }).catch(() => ctx.replyWithMarkdown("🧠 *Test*", subjectKeyboard()));
});

bot.action("menu_profile", async (ctx) => {
  const userId = String(ctx.from.id);
  const user = getUser(userId);
  const need = user.lvl * 80;
  const pct = Math.min(100, Math.round(user.xp / need * 100));
  const bar = "▓".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));
  const ql = user.quizLog || [];
  const totCorr = ql.reduce((s, q) => s + (q.c || 0), 0);

  await ctx.editMessageText(
    `⭐ *Profil* ⭐\n\n`
    + `👤 ${user.name}\n`
    + `📈 Daraja: *${user.lvl}* 🏅 Medallar: *${user.medals}*\n`
    + `🔥 Streak: *${user.streak}* kun\n`
    + `💬 Suhbatlar: *${user.chatCount}*\n`
    + `🧠 Testlar: *${ql.length}* (✅ ${totCorr} to'g'ri)\n\n`
    + `*${user.lvl}-daraja* (${user.xp}/${need} XP)\n${bar} ${pct}%`,
    { parse_mode: "Markdown", ...mainKeyboard() }
  ).catch(() => ctx.replyWithMarkdown("⭐ Profil", mainKeyboard()));
});

bot.action("menu_daily", async (ctx) => {
  const userId = String(ctx.from.id);
  const user = getUser(userId);
  const today = new Date().toDateString();

  if (user.lastDaily === today) {
    await ctx.answerCbQuery("✅ Bugun olgansiz! Ertaga yana keling!");
    return;
  }

  const bonus = 20 + user.streak * 3;
  user.streak++;
  user.lastDaily = today;
  updateUser(userId, user);
  addXP(userId, bonus);

  await ctx.editMessageText(
    `🎁 *Kunlik sovg'a!*\n\n`
    + `Siz *${bonus} XP* oldingiz! 🔥\n`
    + `Ketma-ket *${user.streak}* kun!`,
    { parse_mode: "Markdown", ...mainKeyboard() }
  ).catch(() => ctx.replyWithMarkdown(`🎁 +${bonus} XP!`, mainKeyboard()));
});

bot.action("menu_games", async (ctx) => {
  await ctx.editMessageText("🎮 *O'yinlar*\n\nQaysi o'yinni o'ynashni xohlaysiz?", {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("🔢 Matematika jangi", "game_math"),
       Markup.button.callback("🔤 So'z topish", "game_word")],
      [Markup.button.callback("🔙 Orqaga", "back_main")]
    ])
  }).catch(() => ctx.replyWithMarkdown("🎮 O'yinlar", Markup.inlineKeyboard([
    [Markup.button.callback("🔢 Matematika jangi", "game_math"),
     Markup.button.callback("🔤 So'z topish", "game_word")]
  ])));
});

bot.action("menu_chat", async (ctx) => {
  const userId = String(ctx.from.id);
  const user = getUser(userId);
  user.chatMode = true;
  user.chatSubject = "Matematika";
  updateUser(userId, user);
  await ctx.editMessageText(
    "💬 *AI bilan suhbat*\n\n"
    + "Menga istalgan savolingizni yozib yuboring!\n"
    + "Men tushuntirib beraman, misol yechaman va test ham beraman.\n\n"
    + "Avval fan tanlang:",
    { parse_mode: "Markdown", ...subjectKeyboard() }
  ).catch(() => ctx.replyWithMarkdown("💬 Savolingizni yozing!", mainKeyboard()));
});

bot.action("back_main", async (ctx) => {
  const userId = String(ctx.from.id);
  const user = getUser(userId);
  user.chatMode = false;
  updateUser(userId, user);
  await ctx.editMessageText("🏠 *Bosh menyu*", {
    parse_mode: "Markdown", ...mainKeyboard()
  }).catch(() => ctx.replyWithMarkdown("🏠 Bosh menyu", mainKeyboard()));
});

// ===== SUBJECT SELECTION =====
bot.action(/subj_(.+)/, async (ctx) => {
  const userId = String(ctx.from.id);
  const user = getUser(userId);
  const subject = ctx.match[1];

  // Check if we're in chat mode or quiz mode
  if (user.chatMode) {
    user.chatMode = true;
    user.chatSubject = subject;
    updateUser(userId, user);
    await ctx.editMessageText(
      `💬 *${SUBJ_ICONS[subject] || ""} ${subject}*\n\n`
      + `Endi menga ${subject} fanidan savolingizni yozib yuboring! 😊\n`
      + `Masalan: "5+3 nimaga teng?", "Harflarni o'rgat", "Test ber"`,
      { parse_mode: "Markdown", ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Orqaga", "back_main")]]) }
    ).catch(() => ctx.reply("OK"));
    return;
  }

  // Start quiz
  await startQuiz(ctx, userId, subject);
});

// ===== QUIZ =====
async function startQuiz(ctx, userId, subject) {
  const isEng = subject === "Ingliz tili" || subject === "Science";
  const prompt = isEng
    ? `Create 5 simple multiple choice quiz questions for ${subject} for grades 1-4. Use very simple English. Format EXACTLY as: QUESTION|A) opt1|B) opt2|C) opt3|D) opt4|CORRECT_LETTER`
    : `${subject} fanidan 1-4 sinf uchun 5 ta oson test savoli tuz. Format: SAVOL|A) var1|B) var2|C) var3|D) var4|TOGRI_HARF`;

  await ctx.editMessageText(`🧠 ${subject} test tayyorlanmoqda... ⏳`).catch(() => ctx.reply("⏳"));

  try {
    const resp = await askGroq([
      { role: "system", content: "Sen 1-4 sinf uchun test tuzuvchisan. Faqat format bo'yicha, qo'shimcha yozma." },
      { role: "user", content: prompt }
    ]);

    const lines = resp.split("\n").filter(l => l.trim());
    const questions = lines.map(l => {
      const p = l.split("|").map(x => x.trim());
      if (p.length < 6) return null;
      return {
        q: p[0],
        o: p.slice(1, 5).map(x => x.replace(/^[A-D]\)\s*/, "")),
        c: p[5].toUpperCase()
      };
    }).filter(x => x);

    if (questions.length < 3) {
      await ctx.editMessageText("❌ Testlar yetarli emas. Qayta urunib ko'ring.", {
        parse_mode: "Markdown", ...mainKeyboard()
      }).catch(() => ctx.reply("❌ Xatolik"));
      return;
    }

    // Store quiz state
    const user = getUser(userId);
    user.quizState = { questions, idx: 0, correct: 0, wrong: 0, subject };
    updateUser(userId, user);
    showQuizQ(ctx, userId);

  } catch (e) {
    await ctx.editMessageText("❌ Xatolik: " + e.message, {
      ...mainKeyboard()
    }).catch(() => ctx.reply("❌ Xatolik"));
  }
}

async function showQuizQ(ctx, userId) {
  const user = getUser(userId);
  const qs = user.quizState;
  if (!qs || qs.idx >= qs.questions.length) {
    showQuizResult(ctx, userId);
    return;
  }
  const q = qs.questions[qs.idx];
  let txt = `*${qs.idx + 1}/${qs.questions.length}* — ${q.q}\n\n`;
  q.o.forEach((o, i) => { txt += `${["A","B","C","D"][i]}) ${o}\n`; });
  txt += "\nJavobingizni tanlang:";

  const kb = Markup.inlineKeyboard([
    [
      Markup.button.callback("A) " + q.o[0], "qa_" + userId + "_A"),
      Markup.button.callback("B) " + q.o[1], "qa_" + userId + "_B")
    ],
    [
      Markup.button.callback("C) " + q.o[2], "qa_" + userId + "_C"),
      Markup.button.callback("D) " + q.o[3], "qa_" + userId + "_D")
    ]
  ]);

  await ctx.editMessageText(txt, { parse_mode: "Markdown", ...kb })
    .catch(() => ctx.replyWithMarkdown(txt, kb));
}

bot.action(/qa_(\d+)_([A-D])/, async (ctx) => {
  const userId = ctx.match[1];
  const answer = ctx.match[2];
  const user = getUser(userId);
  const qs = user.quizState;
  if (!qs || qs.idx >= qs.questions.length) return;

  const q = qs.questions[qs.idx];
  const correct = q.c;

  if (answer === correct) {
    qs.correct++;
    addXP(userId, 10);
    await ctx.answerCbQuery("✅ To'g'ri! " + ENC[Math.floor(Math.random() * ENC.length)]);
  } else {
    qs.wrong++;
    await ctx.answerCbQuery("❌ Noto'g'ri. Javob: " + correct + ") " + q.o[["A","B","C","D"].indexOf(correct)]);
  }

  qs.idx++;
  user.quizState = qs;
  updateUser(userId, user);

  if (qs.idx >= qs.questions.length) {
    showQuizResult(ctx, userId);
  } else {
    showQuizQ(ctx, userId);
  }
});

async function showQuizResult(ctx, userId) {
  const user = getUser(userId);
  const qs = user.quizState;
  if (!qs) return;

  const total = qs.correct + qs.wrong;
  const pct = total > 0 ? Math.round(qs.correct / total * 100) : 0;
  let txt = `📊 *Test natijasi:* ${qs.subject}\n\n✅ To'g'ri: ${qs.correct}\n❌ Noto'g'ri: ${qs.wrong}\n📈 Foiz: ${pct}%\n\n`;

  if (pct >= 80) {
    txt += "🏆 *Ajoyib natija!*"; addXP(userId, 30);
  } else if (pct >= 50) {
    txt += "👍 *Yaxshi!* Yana mashq qilaylik!"; addXP(userId, 15);
  } else {
    txt += "💪 *Barakalla!* Qayta urin, albatta yaxshilanadi!"; addXP(userId, 5);
  }

  // Update world progress
  const w = user.worldProg[qs.subject] || 0;
  user.worldProg[qs.subject] = Math.min(100, w + Math.round(pct / 5));
  user.quizLog.push({ s: qs.subject, c: qs.correct, w: qs.wrong, t: new Date().toISOString() });
  if (user.quizLog.length > 100) user.quizLog = user.quizLog.slice(-100);
  user.quizState = null;
  updateUser(userId, user);

  await ctx.editMessageText(txt, { parse_mode: "Markdown", ...mainKeyboard() })
    .catch(() => ctx.replyWithMarkdown(txt, mainKeyboard()));
}

// ===== GAMES =====
bot.action("game_math", async (ctx) => {
  const userId = String(ctx.from.id);
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * a) + 1;
  const op = Math.random() > 0.5 ? "+" : "-";
  const ans = op === "+" ? a + b : a - b;

  const user = getUser(userId);
  user.gameState = { type: "math", answer: ans, score: 0 };
  updateUser(userId, user);

  await ctx.editMessageText(
    `🔢 *Matematika jangi*\n\n⭐ Ball: 0\n\n${a} ${op} ${b} = ?\n\nJavobingizni raqam bilan yozing!`,
    { parse_mode: "Markdown", ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Orqaga", "menu_games")]]) }
  ).catch(() => ctx.reply("🔢 O'yin boshlandi! Javobni yozing."));
});

bot.action("game_word", async (ctx) => {
  const words = [
    { w: "OLMA", h: "Qizil, sariq meva" }, { w: "KITOB", h: "Bilim manbai" },
    { w: "QALAM", h: "Chizish uchun" }, { w: "BOG'", h: "Gullar o'sadigan joy" },
    { w: "SUT", h: "Oq ichimlik" }, { w: "BALIQ", h: "Suvda yashaydi" }
  ];
  const pick = words[Math.floor(Math.random() * words.length)];
  const letters = pick.w.split("");
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }

  const userId = String(ctx.from.id);
  const user = getUser(userId);
  user.gameState = { type: "word", answer: pick.w, found: "", hint: pick.h, letters };
  updateUser(userId, user);

  await ctx.editMessageText(
    `🔤 *So'z topish*\n\n🗝️ ${pick.h}\n\nHarflar: ${letters.join(" ")}\n\nSo'zni toping! Harflarni ketma-ket yozing.`,
    { parse_mode: "Markdown", ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Orqaga", "menu_games")]]) }
  ).catch(() => ctx.reply("🔤 So'z topish!"));
});

// ===== TEXT HANDLER (for games, chat, math answers) =====
bot.on("text", async (ctx) => {
  const userId = String(ctx.from.id);
  const user = getUser(userId);
  const text = ctx.message.text.trim();

  // Math game
  if (user.gameState && user.gameState.type === "math") {
    const num = parseInt(text);
    if (!isNaN(num)) {
      if (num === user.gameState.answer) {
        user.gameState.score++;
        addXP(userId, 5);
        updateUser(userId, user);
        await ctx.reply(`✅ To'g'ri! Ball: ${user.gameState.score} 🎉\nYana bir misol:\n\nYangi misolni yozing yoki /game ni bosing.`);

        // Generate new question
        const a = Math.floor(Math.random() * 20) + 1;
        const b = Math.floor(Math.random() * a) + 1;
        const op = Math.random() > 0.5 ? "+" : "-";
        user.gameState.answer = op === "+" ? a + b : a - b;
        updateUser(userId, user);
        await ctx.reply(`🔢 ${a} ${op} ${b} = ?`);
      } else {
        await ctx.reply(`❌ Noto'g'ri. Qayta urun! 💪 (Javob: ${user.gameState.answer})`);
        user.gameState.answer = null;
        updateUser(userId, user);
      }
    }
    return;
  }

  // Word game
  if (user.gameState && user.gameState.type === "word") {
    const guess = text.toUpperCase();
    if (guess === user.gameState.answer) {
      addXP(userId, 8);
      user.gameState = null;
      updateUser(userId, user);
      await ctx.reply(`🎉 *Topdingiz!* So'z: ${guess}\n\n+8 XP!`, { parse_mode: "Markdown" });
    } else {
      await ctx.reply(`❌ Noto'g'ri. Yana urun! 🗝️ ${user.gameState.hint}`);
    }
    return;
  }

  // AI Chat mode
  if (user.chatMode) {
    const subject = user.chatSubject || "Matematika";
    const isEng = subject === "Ingliz tili" || subject === "Science";
    const sysPrompt = `Sen SmartBolajon AI — O'zbekiston 1-4 sinf o'quvchilari uchun AI o'qituvchisan. Juda do'stona, quvnoq va sabrli bo'l. Bolalarni tez-tez maqtab, rag'batlantir. Javoblarni SODDA, QISQA va TUSHUNARLI qilib yoz. ${isEng ? "Ingliz tilida javob ber." : "O'zbek tilida javob ber."} Fan: ${subject}`;

    try {
      const history = user.chatHistory || [];
      const reply = await askGroq([
        { role: "system", content: sysPrompt },
        ...history.slice(-10),
        { role: "user", content: text }
      ]);

      history.push({ role: "user", content: text });
      history.push({ role: "assistant", content: reply });
      if (history.length > 30) history.splice(0, history.length - 30);
      user.chatHistory = history;
      user.chatCount = (user.chatCount || 0) + 1;
      addXP(userId, 2);
      updateUser(userId, user);

      await ctx.reply(reply, Markup.inlineKeyboard([
        [Markup.button.callback("✅ To'g'ri", "chat_good"),
         Markup.button.callback("🔄 Yana", "chat_again")],
        [Markup.button.callback("🔙 Asosiy menyu", "back_main")]
      ]));
    } catch (e) {
      await ctx.reply("❌ Xatolik: " + e.message + ". Qayta urunib ko'ring.");
    }
    return;
  }

  // Default: unknown command
  await ctx.reply(
    "Men sizni tushunmadim 🤔\n\n"
    + "Yordam uchun /start ni bosing yoki pastdagi tugmalardan foydalaning!",
    mainKeyboard()
  );
});

// ===== CALLBACK HELPERS =====
bot.action("chat_good", async (ctx) => {
  await ctx.answerCbQuery("😊 Zo'r! Davom eting!");
});
bot.action("chat_again", async (ctx) => {
  await ctx.editMessageText("💬 Yana savol yozing!", {
    ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Asosiy menyu", "back_main")]])
  }).catch(() => ctx.reply("Yana savol yozing!"));
});

// ===== QUIZ TEXT RESPONSE =====
bot.hears(/^(A|B|C|D)$/i, async (ctx) => {
  const userId = String(ctx.from.id);
  const user = getUser(userId);
  if (user.quizState && user.quizState.idx < user.quizState.questions.length) {
    // Simulate button press
    await ctx.deleteMessage().catch(() => {});
    // Trigger the callback handler manually
    const answer = ctx.message.text.toUpperCase();
    const q = user.quizState.questions[user.quizState.idx];
    if (answer === q.c) {
      user.quizState.correct++;
      addXP(userId, 10);
      await ctx.reply("✅ To'g'ri! " + ENC[Math.floor(Math.random() * ENC.length)]);
    } else {
      user.quizState.wrong++;
      await ctx.reply(`❌ Noto'g'ri. Javob: ${q.c}) ${q.o[["A","B","C","D"].indexOf(q.c)]}`);
    }
    user.quizState.idx++;
    updateUser(userId, user);
    if (user.quizState.idx >= user.quizState.questions.length) {
      showQuizResultText(ctx, userId);
    } else {
      showQuizQText(ctx, userId);
    }
  }
});

async function showQuizQText(ctx, userId) {
  const user = getUser(userId);
  const qs = user.quizState;
  if (!qs) return;
  const q = qs.questions[qs.idx];
  let txt = `*${qs.idx + 1}/${qs.questions.length}* — ${q.q}\n\n`;
  q.o.forEach((o, i) => { txt += `${["A","B","C","D"][i]}) ${o}\n`; });
  txt += "\nJavob: A/B/C/D yozing";
  await ctx.replyWithMarkdown(txt);
}

async function showQuizResultText(ctx, userId) {
  const user = getUser(userId);
  const qs = user.quizState;
  if (!qs) return;
  const total = qs.correct + qs.wrong;
  const pct = total > 0 ? Math.round(qs.correct / total * 100) : 0;
  let txt = `📊 *Test natijasi:* ${qs.subject}\n\n✅ ${qs.correct}\n❌ ${qs.wrong}\n📈 ${pct}%\n\n`;
  if (pct >= 80) { txt += "🏆 Ajoyib!"; addXP(userId, 30); }
  else if (pct >= 50) { txt += "👍 Yaxshi!"; addXP(userId, 15); }
  else { txt += "💪 Barakalla!"; addXP(userId, 5); }
  user.worldProg[qs.subject] = Math.min(100, (user.worldProg[qs.subject] || 0) + Math.round(pct / 5));
  user.quizLog.push({ s: qs.subject, c: qs.correct, w: qs.wrong, t: new Date().toISOString() });
  user.quizState = null;
  updateUser(userId, user);
  await ctx.replyWithMarkdown(txt, mainKeyboard());
}

// ===== HELP =====
bot.help(async (ctx) => {
  await ctx.replyWithMarkdown(
    `🧑‍🎓 *SmartBolajon AI — Yordam*\n\n`
    + `📌 /start — Botni qayta ishga tushirish\n`
    + `📚 Fanlar — 6 xil fan bo'yicha o'qish\n`
    + `🧠 Test — Bilimingizni sinash\n`
    + `🎮 O'yinlar — Matematika va so'z o'yinlari\n`
    + `⭐ Profil — XP, daraja, statistika\n`
    + `🎁 Kunlik sovg'a — Har kuni bonus XP\n`
    + `💬 AI Chat — AI o'qituvchi bilan suhbat\n\n`
    + `🎯 1-4 sinf o'quvchilari uchun mo'ljallangan!`,
    mainKeyboard()
  );
});

// ===== HEALTH CHECK SERVER for Render =====
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("SmartBolajon AI bot ishlamoqda!");
}).listen(PORT, () => {
  console.log("🌐 Health check server port: " + PORT);
});

// ===== LAUNCH =====
bot.launch().then(() => {
  console.log("🧑‍🎓 SmartBolajon AI bot ishga tushdi!");
}).catch((err) => {
  console.error("Bot xatosi:", err);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
