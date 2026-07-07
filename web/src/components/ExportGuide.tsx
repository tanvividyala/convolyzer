import { useState } from 'react';

export function ExportGuide() {
  const [open, setOpen] = useState(false);

  return (
    <section style={{ maxWidth: 760, margin: '0 auto', padding: '0 2rem 2rem', textAlign: 'center' }}>
      <button className="btn btn-ghost" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide export instructions' : 'How do I export my chats?'}
      </button>

      {open && (
        <div className="card" style={{ marginTop: '1rem', textAlign: 'left' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>iMessage</h3>
          <p style={{ marginBottom: '1.25rem' }}>
            Export your chat history as a txt file using a third-party tool like{' '}
            <a href="https://github.com/reagentx/imessage-exporter" target="_blank" rel="noreferrer">
              imessage-exporter
            </a>
            .
          </p>

          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>Instagram</h3>
          <ol style={{ marginBottom: '1.25rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <li>Go to Instagram Settings → Account Center → Your information and permissions → Download your information</li>
            <li>Request a download of your Messages in JSON format</li>
            <li>Wait for Instagram to prepare your download (usually takes a few hours to a day)</li>
            <li>Download and extract the ZIP file</li>
            <li>
              Find the conversation you want in{' '}
              <code style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.85em' }}>your_activity_across_facebook/messages/inbox/</code>
            </li>
            <li>Upload the json file (or similar) to this app</li>
          </ol>

          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>Discord</h3>
          <p>
            Export your server or DM history using a third-party tool like{' '}
            <a href="https://github.com/Tyrrrz/DiscordChatExporter" target="_blank" rel="noreferrer">
              DiscordChatExporter
            </a>
            . Export as CSV for best results. Keep in mind exporting using a tool like this may go against Discord
            ToS, so use at your own risk.
          </p>
        </div>
      )}
    </section>
  );
}
