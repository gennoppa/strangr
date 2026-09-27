// Terms of Service and Privacy Policy for Strangr.
// ⚠️ Template written for a small hobby project — have it reviewed by a lawyer before you grow.

export const CONTACT_EMAIL = 'hello@hellostrangr.com';
const EFFECTIVE = '28 September 2026';

function LegalLayout({ title, emoji, children }) {
  return (
    <main className="legal">
      <article className="legal-card pop-in">
        <a href="/" className="legal-back">← Back to Strangr</a>
        <div className="legal-emoji" aria-hidden>{emoji}</div>
        <h1>{title}</h1>
        <p className="muted legal-date">Effective {EFFECTIVE}</p>
        {children}
        <footer className="legal-footer">
          <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a> ·{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </footer>
      </article>
    </main>
  );
}

export function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" emoji="📜">
      <p className="legal-tldr">
        <b>TL;DR:</b> You must be 18+. Be kind. No nudity, hate, harassment, spam or illegal stuff. Chats aren’t
        recorded, but strangers are strangers — protect yourself. Break the rules and you get banned.
      </p>

      <h2>1. Who we are</h2>
      <p>
        Strangr (“we”, “us”) runs the website <b>hellostrangr.com</b>, a free service that randomly connects two
        people for a one-on-one video or text chat. By using Strangr you agree to these Terms and to our{' '}
        <a href="/privacy">Privacy Policy</a>. If you don’t agree, please don’t use the service.
      </p>

      <h2>2. You must be 18 or older</h2>
      <p>
        Strangr is only for adults aged <b>18+</b>. By using it you confirm you are at least 18. If we believe a user
        is under 18 we will remove and ban them. If you meet someone who seems to be a minor, end the chat and report
        them.
      </p>

      <h2>3. Rules of the vibe</h2>
      <p>When using Strangr you agree <b>not</b> to:</p>
      <ul>
        <li>show or share nudity, sexual content or sexual behaviour;</li>
        <li>harass, bully, threaten, stalk or intimidate anyone;</li>
        <li>post hate speech or attack people based on religion, caste, race, gender, sexuality, disability or origin;</li>
        <li>share anything involving minors in a sexual or harmful way — this is reported to authorities;</li>
        <li>show violence, self-harm, weapons used to threaten, or illegal drugs;</li>
        <li>spam, advertise, scam, phish or ask for money, OTPs, passwords or personal details;</li>
        <li>record, screenshot or broadcast other users without their clear consent;</li>
        <li>impersonate someone else or pretend to be Strangr staff;</li>
        <li>use bots, scripts or automated tools, or try to hack, overload or disrupt the service;</li>
        <li>break any law of India or of the place you live.</li>
      </ul>

      <h2>4. Reporting, blocking and bans</h2>
      <p>
        You can block or report anyone at any time. Reports may lead to an automatic temporary ban of the reported
        person’s IP address (currently 24 hours after multiple reports). We may also suspend or permanently block
        anyone, at our discretion and without notice, to keep Strangr safe. Please don’t abuse the report button.
      </p>

      <h2>5. Your safety</h2>
      <ul>
        <li>People you meet are strangers. We don’t verify identities and aren’t responsible for what other users say or do.</li>
        <li>Never share your full name, address, school/workplace, phone number, passwords or money.</li>
        <li>Video connects directly between devices, so the other person’s device can technically see your IP address. See the <a href="/privacy">Privacy Policy</a>.</li>
        <li>If you feel unsafe, end the chat immediately. In an emergency, contact local authorities (India: <b>112</b>).</li>
      </ul>

      <h2>6. Your content</h2>
      <p>
        You are responsible for everything you say and show on Strangr. We don’t store your chats or video (see the
        Privacy Policy), and we don’t claim ownership of anything you share.
      </p>

      <h2>7. The service is provided “as is”</h2>
      <p>
        Strangr is a free hobby project. It may go down, change, or stop at any time. To the maximum extent allowed by
        law, we provide it without warranties of any kind and are not liable for any indirect, incidental or
        consequential damages, or for the conduct of other users. Nothing here limits rights you have that cannot be
        excluded by law.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update these Terms. The “Effective” date above will change, and continuing to use Strangr means you
        accept the updated Terms.
      </p>

      <h2>9. Law and contact</h2>
      <p>
        These Terms are governed by the laws of India. Questions, complaints or legal notices:{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" emoji="🔒">
      <p className="legal-tldr">
        <b>TL;DR:</b> No accounts, no chat logs, no video recording, no ads, no tracking cookies. We only briefly use
        your IP address to connect you and to enforce bans.
      </p>

      <h2>1. What we collect — and what we don’t</h2>
      <table className="legal-table">
        <thead>
          <tr><th>Data</th><th>Why</th><th>How long</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><b>IP address</b></td>
            <td>To connect you, prevent abuse and enforce reports/bans</td>
            <td>In server memory while you’re connected; kept up to 24 h only if you are reported or banned</td>
          </tr>
          <tr>
            <td><b>Mood & interests</b> you pick</td>
            <td>To match you with a compatible stranger</td>
            <td>Only while you’re searching/chatting — never saved</td>
          </tr>
          <tr>
            <td><b>Text messages</b></td>
            <td>Passed straight to the other person</td>
            <td>Not stored — gone when the chat ends</td>
          </tr>
          <tr>
            <td><b>Video & audio</b></td>
            <td>Sent directly between the two devices (peer-to-peer)</td>
            <td>Never recorded or stored by us</td>
          </tr>
          <tr>
            <td><b>Report reason</b></td>
            <td>To act on abuse</td>
            <td>Short-lived server logs only</td>
          </tr>
        </tbody>
      </table>
      <p>
        We do <b>not</b> ask for your name, email, phone number or any account. We do not use advertising or
        analytics cookies, and we don’t sell or share data for marketing.
      </p>

      <h2>2. Peer-to-peer video and your IP address</h2>
      <p>
        To keep video fast and private from our servers, your device connects directly to the other person’s device
        (WebRTC). A technical side effect is that the other person’s device can see your IP address, which can reveal
        your approximate location (city/region, not your exact address). When a direct connection isn’t possible, video
        is relayed through our TURN provider (see below) in encrypted form.
      </p>

      <h2>3. Service providers we rely on</h2>
      <ul>
        <li><b>Render</b> — hosts the website and chat server (may keep standard request logs, including IP addresses).</li>
        <li><b>Cloudflare</b> — domain and DNS.</li>
        <li><b>Metered</b> — TURN relay that forwards encrypted video when devices can’t connect directly.</li>
        <li><b>Google STUN servers</b> — help your device discover how to connect (sees your IP address).</li>
      </ul>
      <p>These providers may process data outside India under their own privacy policies.</p>

      <h2>4. Storage on your device</h2>
      <p>
        We may store small settings in your browser (like your last-picked mood) to make the app smoother. You can
        clear them any time in your browser settings. Camera and microphone access is only used while you chat and
        can be revoked in your browser.
      </p>

      <h2>5. Children</h2>
      <p>
        Strangr is for adults 18+ only. We don’t knowingly process data of anyone under 18. If you believe a minor is
        using Strangr, contact us and we’ll act on it.
      </p>

      <h2>6. Security</h2>
      <p>
        All connections use HTTPS/TLS, and WebRTC video is always encrypted in transit. No system is 100% secure, so
        please don’t share sensitive personal information in chats.
      </p>

      <h2>7. Your rights</h2>
      <p>
        Under India’s Digital Personal Data Protection Act, 2023 and similar laws, you can ask us what personal data we
        hold about you, ask us to correct or erase it, withdraw consent, and raise a grievance. Because we keep almost
        nothing, most requests can be answered quickly. Email{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> — we aim to respond within 30 days.
      </p>

      <h2>8. Changes</h2>
      <p>
        If we change how we handle data (for example, adding optional features that save data), we’ll update this
        page and the “Effective” date before the change applies.
      </p>

      <h2>9. Contact / grievance officer</h2>
      <p>
        Strangr privacy contact: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </LegalLayout>
  );
}
