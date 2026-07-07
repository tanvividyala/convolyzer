# Convolyzer: Message History Analysis & Visualization Tool

This started as a personal project to analyze my best friend and I's conversation history over the past 7 years and get the hang of basic data science tools: pandas for cleaning, plotly for visualization, NLTK/VADER for text processing, and scikit-learn for clustering. It's since grown into two full apps for exploring your own conversation history. Check out the original demo:

[![Watch the video demo](https://img.youtube.com/vi/jQuLD7CuNTA/0.jpg)](https://www.youtube.com/watch?v=jQuLD7CuNTA)

## Web App (recommended)
A browser-based app at [tanvividyala.github.io/convolyzer](https://tanvividyala.github.io/convolyzer/). Your file is parsed and analyzed entirely client-side; nothing is uploaded anywhere except the optional AI features below, which call the APIs directly from your browser with a key you provide.

**Features**
- Quick stats, message trends over time, and who's-talking-more breakdowns
- Word & emoji frequency analysis
- Semantic search across your whole history, with embeddings computed in-browser (Transformers.js)
- Linguistic mirroring analysis: how much you and the other person's language converges over time
- AI-generated daily summaries (bring your own Anthropic API key)

## Streamlit App
A Python version at [convolyzer.streamlit.app](https://convolyzer.streamlit.app/).

**Features**
- Quick stats and message-over-time trends
- Who's-talking-more breakdown
- Sentiment analysis with a calendar view and trend charts (VADER)
- Word tracking, top words, and top emojis
- AI-generated daily summaries (bring your own Anthropic API key)
- Semantic search across your entire history via Voyage AI embeddings (bring your own Anthropic and Voyage API keys)

Feel free to use `sample_conversation_data.csv` to try either app.

## Getting Your Conversation Data

### iMessage
Export your chat history as a TXT file using a third-party tool like [imessage-exporter](https://github.com/reagentx/imessage-exporter).

### Instagram
1. Go to Instagram Settings → Account Center → Your information and permissions → Download your information
2. Request a download of your Messages in JSON format
3. Wait for Instagram to prepare your download (usually takes a few hours to a day)
4. Download and extract the ZIP file
5. Find the conversation you want in `your_activity_across_facebook/messages/inbox/`
6. Upload the JSON file to either app

### Discord
Export your server or DM history using a third-party tool like [DiscordChatExporter](https://github.com/Tyrrrz/DiscordChatExporter). Export as CSV for best results. Keep in mind exporting this way may go against Discord's ToS, so use at your own risk.

## Running Locally

**Web app**
```
cd web
npm install
npm run dev
```

**Streamlit app**
```
pip install -r requirements.txt
streamlit run app.py
```
