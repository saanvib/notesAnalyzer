# notesAnalyzer

A website and chrome extension to help with music education.

Website - users can record or upload a sound file to create notated/sheet music as an output. This is incredibly useful for students who want to check their own singing or just play around with audio files and notated music.

Chrome extension - for teachers using the Sight Reading Factory platform. With this extension, when grading student assignments, teachers can more easily verify student singing with a click of a button. The extension takes the student audio file from the website itself, analyzes it, and displays sheet music of the notes directly below the example sheet music that SRF provides to the student. It is displayed in the same key and time signature as the original piece, so teachers can easily compare the expected result to the student result.

# Deployment instructions

gcloud auth login
gcloud functions deploy analyze_file --runtime python39 --trigger-http --allow-unauthenticated --memory=4096MB
gsutil cors set cors_gs.json gs://notes-analyzer-music-files
