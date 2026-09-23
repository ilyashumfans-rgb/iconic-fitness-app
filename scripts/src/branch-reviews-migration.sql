BEGIN;
CREATE TABLE IF NOT EXISTS branch_reviews (
  id serial PRIMARY KEY,
  reviewer_name text NOT NULL CHECK (char_length(btrim(reviewer_name)) BETWEEN 1 AND 100),
  branch_name text NOT NULL CHECK (char_length(btrim(branch_name)) BETWEEN 1 AND 150),
  review_text text NOT NULL CHECK (char_length(btrim(review_text)) BETWEEN 1 AND 2000),
  rating integer NOT NULL CONSTRAINT branch_reviews_rating_check CHECK (rating BETWEEN 1 AND 5),
  is_sample boolean NOT NULL,
  is_published boolean NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  seed_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT branch_reviews_sample_check CHECK (seed_key IS NULL OR is_sample = true)
);
COMMIT;