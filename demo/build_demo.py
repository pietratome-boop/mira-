"""Gera demo/mira-demo.html (protótipo para testar sem Supabase) a partir do index.html.

Uso:  python3 demo/build_demo.py
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
src = (ROOT / "index.html").read_text(encoding="utf-8")
stub = (ROOT / "demo" / "stub-supabase.js").read_text(encoding="utf-8")


def swap(text, old, new):
    if old not in text:
        raise SystemExit(f"trecho não encontrado: {old[:70]!r}")
    return text.replace(old, new, 1)


# A página do artefato ganha o próprio esqueleto <html>/<head>/<body>: tiramos o nosso.
html = re.sub(r"^<!doctype html>\s*<html[^>]*>\s*<head>\s*", "", src, flags=re.I)
html = re.sub(r'<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*', "", html)
html = swap(html, "</head>\n<body>\n", "")
html = swap(html, "</body>\n</html>", "")
html = swap(html, "<title>Mira · estudos</title>", "<title>Mira</title>")

# Troca o Supabase de verdade pelo de mentira (dados só no navegador).
html = swap(
    html,
    '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',
    "<script>\n" + stub + "</script>",
)

DEMO_CSS = """/* faixa do protótipo */
.demobar{margin-top:22px;border:1px dashed var(--terra);border-radius:var(--r);padding:16px 18px;background:var(--terra-soft);font-size:14.5px;display:flex;flex-direction:column;gap:12px}
.demobar p{margin:0}
.demobtns{display:flex;flex-wrap:wrap;gap:8px}
.demobtns button{font-family:var(--sans);font-size:14px;font-weight:700;border-radius:10px;padding:9px 14px;cursor:pointer;border:1px solid var(--teal);background:var(--teal);color:var(--bg)}
.demobtns button.alt{background:none;color:var(--teal)}
.demobtns button.quiet{background:none;color:var(--muted);border-color:var(--line);font-weight:600}
button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--terra);outline-offset:2px}
"""
html = swap(html, "</style>", DEMO_CSS + "</style>")

DEMO_BAR = """<div class="wrap">
  <div class="demobar" id="demobar">
    <p><b>Protótipo para teste.</b> Tudo funciona como no site de verdade, mas as contas e os dados ficam só neste navegador. Os alunos abaixo são de exemplo (senha de todos: <b>mira123</b>).</p>
    <div class="demobtns">
      <button id="demo-aluno">Entrar como aluna (Júlia)</button>
      <button id="demo-prof" class="alt">Entrar como professora</button>
      <button id="demo-reset" class="quiet">Recomeçar o teste</button>
    </div>
  </div>
"""
html = swap(html, '<div class="wrap">\n', DEMO_BAR)

DEMO_JS = """
/* ---------- BOTÕES DO PROTÓTIPO ---------- */
$('demo-aluno').addEventListener('click',async()=>{await flush();window.__miraDemo.loginAs('julia@exemplo.com');});
$('demo-prof').addEventListener('click',async()=>{await flush();window.__miraDemo.loginAs('professora@exemplo.com');});
$('demo-reset').addEventListener('click',async()=>{
 if(!await ask('Apagar as contas criadas e voltar os alunos de exemplo ao começo?','Recomeçar'))return;
 dirty=false;clearTimeout(syncT);window.__miraDemo.reset();await sb.auth.signOut();
});
"""
html = swap(html, "/* ---------- ORQUESTRAÇÃO ---------- */", DEMO_JS + "\n/* ---------- ORQUESTRAÇÃO ---------- */")

out = ROOT / "demo" / "mira-demo.html"
out.write_text(html, encoding="utf-8")
print(f"ok: {out.relative_to(ROOT)} ({len(html)//1024} KB)")
