import fs from "fs/promises";
import path from "path";

function normalize(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function clean(text, max = 6000) {
  return String(text ?? "").trim().slice(0, max);
}

function sentence(text) {
  const s = clean(text).replace(/\s+/g, " ");
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function calculate(text) {
  const raw = text.replace(/,/g, ".").match(/[0-9+\-*/().%\s]+/g)?.join("").trim();
  if (!raw || !/[+\-*/%]/.test(raw) || !/^[-+*/%.()\d\s]+$/.test(raw)) return null;
  try {
    // Small arithmetic evaluator: only numeric operators are allowed after validation.
    const result = Function(`"use strict"; return (${raw})`)();
    if (typeof result !== "number" || !Number.isFinite(result)) return null;
    return String(Math.round(result * 1e10) / 1e10);
  } catch {
    return null;
  }
}

function rankKnowledge(question, knowledge) {
  const q = normalize(question);
  const terms = [...new Set(q.split(/[^a-z0-9áéíóúñ]+/).filter(t => t.length >= 3))];
  const hits = [];

  function walk(node, trail = []) {
    if (typeof node === "string") {
      const n = normalize(node);
      const score = terms.reduce((sum, term) => sum + (n.includes(term) ? 1 : 0), 0);
      if (score) hits.push({ score, path: trail.join(" > "), text: node });
      return;
    }
    if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) walk(value, [...trail, key]);
    }
  }
  walk(knowledge);
  return hits.sort((a, b) => b.score - a.score).slice(0, 5);
}

export class LianCore {
  constructor({ knowledge, identity, memoryFile, memoryEnabled = true }) {
    this.knowledge = knowledge;
    this.identity = identity;
    this.memoryFile = memoryFile;
    this.memoryEnabled = memoryEnabled;
  }

  async loadMemories() {
    if (!this.memoryEnabled) return {};
    try { return JSON.parse(await fs.readFile(this.memoryFile, "utf8")); } catch { return {}; }
  }

  async saveMemories(memories) {
    if (!this.memoryEnabled) return;
    await fs.mkdir(path.dirname(this.memoryFile), { recursive: true });
    await fs.writeFile(this.memoryFile, JSON.stringify(memories, null, 2), "utf8");
  }

  async remember(userId, role, content) {
    const memories = await this.loadMemories();
    const current = Array.isArray(memories[userId]) ? memories[userId] : [];
    memories[userId] = [...current, { role, content: clean(content, 1500), at: new Date().toISOString() }].slice(-30);
    await this.saveMemories(memories);
    return memories[userId];
  }

  async answer(question, userId = "default") {
    const q = clean(question, 5000);
    const n = normalize(q);
    const memories = await this.loadMemories();
    const recent = Array.isArray(memories[userId]) ? memories[userId].slice(-30) : [];

    let answer;
    let mode = "lian-core";

    if (/\b(cual es tu nombre|como te llamas|quien eres|que eres|nombre de la ia)\b/.test(n)) {
      answer = this.identity;
    } else {
      const math = calculate(q.replace(/\b(cuanto es|calcula|resuelve)\b/i, ""));
      if (math !== null) {
        answer = `El resultado es **${math}**.`;
        mode = "reasoning";
      } else if (/\b(hola|hey|buenas|que onda)\b/.test(n)) {
        answer = "¡Hola! Soy Lian AI. 😎 ¿Qué quieres hacer?";
      } else if (/(lian parkur|lian parkur 2|nivel|gdevelop|multiplayer|pix|ring master)/.test(n)) {
        const hits = rankKnowledge(q, this.knowledge);
        if (hits.length) {
          answer = `Sí, tengo contexto de Lian Parkur. ${hits.slice(0, 3).map(h => sentence(h.text)).join(" ")}`;
        } else {
          answer = "Tengo la base de conocimiento de Lian Parkur cargada, pero no encontré ese dato exacto. Puedes añadirlo a lian_parkur.json.";
        }
        mode = "knowledge";
      } else if (/\b(que recuerdas|que sabes de mi|mi memoria|recuerdas)\b/.test(n)) {
        const remembered = recent.filter(x => x.role === "memory").map(x => x.content);
        answer = remembered.length
          ? `Recuerdo esto:\n- ${remembered.slice(-8).join("\n- ")}`
          : "Todavía no tengo recuerdos guardados para este usuario.";
        mode = "memory";
      } else if (/\b(no entiendo|explica|que significa|como funciona)\b/.test(n)) {
        answer = "Puedo explicarlo paso a paso. Dime exactamente qué parte quieres entender y usaré mi base de conocimiento y razonamiento local.";
        mode = "reasoning";
      } else {
        const hits = rankKnowledge(q, this.knowledge);
        if (hits.length) {
          answer = `Encontré información relacionada: ${hits[0].text}`;
          mode = "knowledge";
        } else {
          answer = "Soy Lian AI y estoy usando Lian Core, mi motor local. Para preguntas que necesiten conocimiento externo o un modelo generativo grande, esta versión puede quedarse corta; puedes usar el modo web si tu app lo incorpora o añadir conocimiento propio.";
        }
      }
    }

    await this.remember(userId, "user", q);
    await this.remember(userId, "assistant", answer);
    return { answer, mode, memoryItems: recent.length + 2 };
  }
}
