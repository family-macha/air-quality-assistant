const form = document.getElementById('form');
const results = document.getElementById('results');
const status = document.getElementById('status');
const plan = document.getElementById('plan');
const FLAGS = ['children', 'elderly', 'respiratory', 'purifier', 'gasStove'];

/** Build nodes with textContent only, so API data can never inject HTML. */
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function render(data) {
  plan.replaceChildren();
  const banner = el('div', null, `banner band-${data.band.id}`);
  banner.append(el('h2', `${data.place}: ${data.band.label}`), el('p', data.headline));
  plan.append(banner);
  if (data.aiSummary) plan.append(el('p', data.aiSummary, 'ai'));
  const list = el('ol', null, 'actions');
  for (const a of data.actions) {
    const item = el('li');
    item.append(el('h3', a.title), el('p', `Why: ${a.why}`), el('p', `Impact: ${a.impact}`, 'impact'));
    list.append(item);
  }
  plan.append(list);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const body = { city: String(data.get('city') ?? ''), commute: data.get('commute') };
  for (const flag of FLAGS) body[flag] = data.get(flag) === 'on';
  form.submit.disabled = true;
  results.setAttribute('aria-busy', 'true');
  status.textContent = 'Checking air quality…';
  plan.replaceChildren();
  try {
    const res = await fetch('/api/advice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Something went wrong.');
    status.textContent = '';
    render(json);
  } catch (err) {
    status.textContent = err.message;
  } finally {
    form.submit.disabled = false;
    results.setAttribute('aria-busy', 'false');
    results.focus();
  }
});
