// Netlify Function (v2) — receives the contact form and emails it via Resend.
// Requires an environment variable RESEND_API_KEY set in your Netlify site settings.

export default async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let data;
  try {
    data = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const name = (data.name || "").toString().trim();
  const email = (data.email || "").toString().trim();
  const message = (data.message || "").toString().trim();
  const honeypot = (data.company || "").toString().trim();

  // A bot filled the hidden field — pretend it worked, send nothing.
  if (honeypot) return json({ ok: true }, 200);

  if (!name || !email || !message) {
    return json({ error: "All fields are required." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }
  if (message.length > 5000) {
    return json({ error: "Message is too long." }, 400);
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // The FROM domain must be verified in your Resend account.
      from: "Bruce Animation Studios <hello@bruceanimation.com>",
      to: ["archiejohnbruce@outlook.com"],
      reply_to: email, // so hitting "Reply" goes straight to the sender
      subject: `New enquiry from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html: `<p><strong>Name:</strong> ${escapeHtml(name)}</p>
<p><strong>Email:</strong> ${escapeHtml(email)}</p>
<p><strong>Message:</strong></p>
<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
    }),
  });

  if (!res.ok) {
    console.error("Resend error:", res.status, await res.text());
    return json({ error: "Could not send message. Please try again." }, 502);
  }

  return json({ ok: true }, 200);
};

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
