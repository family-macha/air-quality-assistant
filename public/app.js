import { buildRequest, cityError } from './form.js';

const $ = (id) => document.getElementById(id);
const form = $('form');
const cityInput = $('city');
const cityErrorEl = $('city-error');
const statusEl = $('status');
const errorEl = $('server-error');
const plan = $('plan');

/** Builds nodes with textContent only, so API data can never inject HTML. */
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

/** Renders the plan and returns its heading so focus can move there. */
function render(data) {
  const banner = el('div', null, `banner band-${data.band.id}`);
  const heading = el('h2', `${data.place}: ${data.band.label}`);
  heading.tabIndex = -1;
  banner.append(heading, el('p', data.headline));

  const list = el('ol', null, 'actions');
  for (const action of data.actions) {
    const item = el('li');
    item.append(el('h3', action.title), el('p', `Why: ${action.why}`), el('p', `Impact: ${action.impact}`, 'impact'));
    list.append(item);
  }
  plan.replaceChildren(banner, ...(data.aiSummary ? [el('p', data.aiSummary, 'ai')] : []), list);
  return heading;
}

function setBusy(busy) {
  form.submit.disabled = busy;
  form.setAttribute('aria-busy', String(busy));
  statusEl.textContent = busy ? 'Checking air quality…' : '';
}

async function requestPlan(body) {
  const res = await fetch('/api/advice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Something went wrong.');
  return json;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorEl.textContent = '';
  const body = buildRequest(new FormData(form));

  const problem = cityError(body.city);
  cityErrorEl.textContent = problem;
  cityInput.setAttribute('aria-invalid', String(Boolean(problem)));
  if (problem) return cityInput.focus();

  plan.replaceChildren();
  setBusy(true);
  try {
    render(await requestPlan(body)).focus();
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    setBusy(false);
  }
});
