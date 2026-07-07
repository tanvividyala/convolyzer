export function Hero() {
  return (
    <section style={{ maxWidth: 760, margin: '0 auto', padding: '3.5rem 2rem 2rem', textAlign: 'center' }}>
      <div className="section-label" style={{ textAlign: 'center' }}>
        Message History Analysis
      </div>
      <h1>
        Drop in your chats.
        <br />
        See the whole story.
      </h1>
      <p style={{ maxWidth: '52ch', margin: '1.1rem auto 0', fontSize: '1.05rem' }}>
        Drag in exports from iMessage, Instagram, Discord, Google Chat, or plain CSV/JSON, from as many
        platforms as you like. Convolyzer merges them into one timeline of trends, stats, and AI-written
        daily recaps.
      </p>
    </section>
  );
}
