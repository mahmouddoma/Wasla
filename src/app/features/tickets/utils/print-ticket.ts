export interface PrintableTicket {
  practice: string;
  doctor: string;
  patient: string;
  number: number;
  numberLabel: string;
  ahead: string | null;
  date: string;
  footer: string;
  dir: 'rtl' | 'ltr';
  lang: 'ar' | 'en';
}

/** Dynamic data is written only as text, never as HTML or executable source. */
export function printTicket(ticket: PrintableTicket): 'opened' | 'blocked' | 'invalid' {
  if (!Number.isSafeInteger(ticket.number) || ticket.number < 1) return 'invalid';
  const popup = window.open('about:blank', '_blank', 'width=380,height=520');
  if (!popup) return 'blocked';
  popup.opener = null;
  const doc = popup.document;
  const html = doc.createElement('html');
  html.dir = ticket.dir;
  html.lang = ticket.lang;
  const head = doc.createElement('head');
  const charset = doc.createElement('meta');
  charset.setAttribute('charset', 'utf-8');
  const csp = doc.createElement('meta');
  csp.httpEquiv = 'Content-Security-Policy';
  csp.content =
    "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";
  const title = doc.createElement('title');
  title.textContent = `${ticket.numberLabel} ${ticket.number}`;
  const style = doc.createElement('style');
  style.textContent = `@page{size:80mm auto;margin:4mm}body{font-family:system-ui,sans-serif;text-align:center;color:#000;padding:6px;overflow-wrap:anywhere}.title{font-size:16px;font-weight:700}.sub{font-size:13px;margin:4px 0 12px}.ticket-box{border:2px dashed #777;padding:10px;margin:10px 0;border-radius:8px}.num{font-size:38px;font-weight:900;margin:4px 0}.patient{font-size:15px;font-weight:700}.ahead{font-size:13px;margin-top:8px}.footer{font-size:11px;margin-top:14px;border-top:1px solid #ccc;padding-top:6px}`;
  head.append(charset, csp, title, style);
  const body = doc.createElement('body');
  const text = (parent: HTMLElement, className: string, value: string): void => {
    const element = doc.createElement('div');
    element.className = className;
    element.textContent = value;
    parent.append(element);
  };
  text(body, 'title', ticket.practice);
  text(body, 'sub', ticket.doctor);
  const box = doc.createElement('section');
  box.className = 'ticket-box';
  text(box, 'lbl', ticket.numberLabel);
  text(box, 'num', `#${ticket.number}`);
  text(box, 'patient', ticket.patient);
  if (ticket.ahead !== null) text(box, 'ahead', ticket.ahead);
  body.append(box);
  text(body, 'footer', `${ticket.date}\n${ticket.footer}`);
  html.append(head, body);
  doc.replaceChildren(html);
  popup.addEventListener('afterprint', () => popup.close(), { once: true });
  popup.requestAnimationFrame(() => {
    popup.focus();
    popup.print();
  });
  return 'opened';
}
