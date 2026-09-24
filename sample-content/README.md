# Sample learning content

Lesson used for the assignment: **Human Digestive System**.

## Video

https://www.youtube.com/watch?v=AUaVINUiO2I&t=23s

Timestamped transcript chunks used by RAG:

- `human-digestive-system-transcript.json`

## Study material

- `human-digestion-study-guide-v2.pdf` — original study guide (pages 1–4)
- `human-digestive-system-study-material.json` — page-tagged sections ingested into the database
- `digestive-system.txt` — short plain-text overview

`backend` `npm run ingest` reads the JSON files and stores chunks in `content_chunks`.
