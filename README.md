# notesAnalyzer

# Deployment instructions

gcloud auth login
gcloud functions deploy analyze_file --runtime python39 --trigger-http --allow-unauthenticated --memory=4096MB
gsutil cors set cors_gs.json gs://notes-analyzer-music-files
