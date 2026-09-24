-- ============================================
-- SAMPLE LESSON
-- ============================================

INSERT INTO lessons (
    title,
    description,
    video_url
)
VALUES (
    'Human Digestive System',
    'Learn about the human digestive system, digestion, and the role of different digestive organs.',
    'https://www.youtube.com/watch?v=AUaVINUiO2I&t=23s'
)
ON CONFLICT DO NOTHING;