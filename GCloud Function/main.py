from contextlib import nullcontext
import math
import statistics
import tensorflow as tf
import tensorflow_hub as hub
from scipy.io import wavfile
from pydub import AudioSegment
from google.cloud import storage
import music21
import json, random

# TODO: when you record, play the recording, and then record something new, the play button doesnt work

CONFIDENCE_THRESHOLD = 0.6

def convert_audio_for_model(user_file, output_file='/tmp/converted_audio_file.wav'):
  audio = AudioSegment.from_file(user_file)
  EXPECTED_SAMPLE_RATE = 16000
  audio = audio.set_frame_rate(EXPECTED_SAMPLE_RATE).set_channels(1)
  audio.export(output_file, format="wav")
  return output_file

def output2hz(pitch_output):
  PT_OFFSET = 25.58
  PT_SLOPE = 63.07
  FMIN = 10.0
  BINS_PER_OCTAVE = 12.0
  cqt_bin = pitch_output * PT_SLOPE + PT_OFFSET
  return FMIN * 2.0 ** (1.0 * cqt_bin / BINS_PER_OCTAVE)

def download_blob(bucket_name, source_blob_name, destination_file_name):
    """Downloads a blob from the bucket."""
    # The ID of your GCS bucket
    # bucket_name = "your-bucket-name"

    # The ID of your GCS object
    # source_blob_name = "storage-object-name"

    # The path to which the file should be downloaded
    # destination_file_name = "local/path/to/file"

    storage_client = storage.Client()

    bucket = storage_client.bucket(bucket_name)

    # Construct a client side representation of a blob.
    # Note `Bucket.blob` differs from `Bucket.get_blob` as it doesn't retrieve
    # any content from Google Cloud Storage. As we don't need additional data,
    # using `Bucket.blob` is preferred here.
    blob = bucket.blob(source_blob_name)
    blob.download_to_filename(destination_file_name)

    print(
        "Downloaded storage object {} from bucket {} to local file {}.".format(
            source_blob_name, bucket_name, destination_file_name
        )
    )

def hz2offset(freq):
    
    # This measures the quantization error for a single note.
    A4 = 440
    C0 = A4 * pow(2, -4.75)
    if freq == 0:  # Rests always have zero error.
        return None
    # Quantized note.
    h = round(12 * math.log2(freq / C0))
    return 12 * math.log2(freq / C0) - h

def quantize_predictions(group, ideal_offset):
    note_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    A4 = 440
    C0 = A4 * pow(2, -4.75)
    # Group values are either 0, or a pitch in Hz.
    non_zero_values = [v for v in group if v != 0]
    zero_values_count = len(group) - len(non_zero_values)

    # Create a rest if 80% is silent, otherwise create a note.
    if zero_values_count > CONFIDENCE_THRESHOLD * len(group):
        # Interpret as a rest. Count each dropped note as an error, weighted a bit
        # worse than a badly sung note (which would 'cost' 0.5).
        return 0.51 * len(non_zero_values), "Rest"
    else:
        # Interpret as note, estimating as mean of non-rest predictions.
        h = round(statistics.mean([12 * math.log2(freq / C0) - ideal_offset for freq in non_zero_values]))
        octave = h // 12
        n = h % 12
        note = note_names[n] + str(octave)
    # Quantization error is the total difference from the quantized note.
        error = sum([abs(12 * math.log2(freq / C0) - ideal_offset - h) for freq in non_zero_values])
        return error, note

def get_quantization_and_error(pitch_outputs_and_rests, predictions_per_eighth, prediction_start_offset, ideal_offset):
    # Apply the start offset - we can just add the offset as rests.
    pitch_outputs_and_rests = [0] * prediction_start_offset + pitch_outputs_and_rests
    # Collect the predictions for each note (or rest).
    groups = [ pitch_outputs_and_rests[i:i + predictions_per_eighth] for i in range(0, len(pitch_outputs_and_rests), predictions_per_eighth)]

    quantization_error = 0

    notes_and_rests = []
    for group in groups:
        error, note_or_rest = quantize_predictions(group, ideal_offset)
        quantization_error += error
        notes_and_rests.append(note_or_rest)

    return quantization_error, notes_and_rests



def analyze_file(request):
    request_json = request.get_json(silent=True)
    request_args = request.args
    ts1 = "0"
    ts2 = "0"
    sharps = "0"
    flats = "0"
    if request_json and 'filename' in request_json:
        filename = request_json['filename']
    elif request_args and 'filename' in request_args:
        filename = request_args['filename']
        
    if request_json and 'ts1' in request_json:
        ts1 = request_json['ts1']
    elif request_args and 'ts1' in request_args:
        ts1 = request_args['ts1']
        
    if request_json and 'ts2' in request_json:
        ts2 = request_json['ts2']
    elif request_args and 'ts2' in request_args:
        ts2 = request_args['ts2']
        
    if request_json and 'sharps' in request_json:
        sharps = request_json['sharps']
    elif request_args and 'sharps' in request_args:
        sharps = request_args['sharps']
        
    if request_json and 'flats' in request_json:
        flats = request_json['flats']
    elif request_args and 'flats' in request_args:
        flats = request_args['flats']
        
    print("filename is " + filename)
    download_blob("notes-analyzer-music-files", filename, "/tmp/" + filename)
    converted_audio_file = convert_audio_for_model("/tmp/" + filename)
    sample_rate, audio_samples = wavfile.read(converted_audio_file, 'rb')

    duration = len(audio_samples)/sample_rate
    # print(f'Sample rate: {sample_rate} Hz')
    # print(f'Total duration: {duration:.2f}s')
    # print(f'Size of the input: {len(audio_samples)}')
    MAX_ABS_INT16 = 32768.0
    audio_samples = audio_samples / float(MAX_ABS_INT16)

    model = hub.load("https://tfhub.dev/google/spice/2")
    model_output = model.signatures["serving_default"](tf.constant(audio_samples, tf.float32))

    pitch_outputs = model_output["pitch"]
    uncertainty_outputs = model_output["uncertainty"]

    confidence_outputs = 1.0 - uncertainty_outputs
    confidence_outputs = list(confidence_outputs)
    pitch_outputs = [ float(x) for x in pitch_outputs]

    indices = range(len (pitch_outputs))
    confident_pitch_outputs = [ (i,p) for i, p, c in zip(indices, pitch_outputs, confidence_outputs) if  c >= CONFIDENCE_THRESHOLD  ]
    confident_pitch_outputs_x, confident_pitch_outputs_y = zip(*confident_pitch_outputs)

    confident_pitch_values_hz = [ output2hz(p) for p in confident_pitch_outputs_y ] 
    print(confident_pitch_values_hz)
    
    # converting pitch values to musical notes
    
    
    # adding zeros when no singing
    pitch_outputs_and_rests = [output2hz(p) if c >= CONFIDENCE_THRESHOLD else 0 for i, p, c in zip(indices, pitch_outputs, confidence_outputs)]
    
    # note offsets
    A4 = 440
    C0 = A4 * pow(2, -4.75)
    note_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    
    
    # The ideal offset is the mean quantization error for all the notes
    # (excluding rests):
    offsets = [hz2offset(p) for p in pitch_outputs_and_rests if p != 0]
    print("offsets: ", offsets)

    ideal_offset = statistics.mean(offsets)
    print("ideal offset: ", ideal_offset)
    
    best_error = float("inf")
    best_notes_and_rests = None
    best_predictions_per_note = None

    for predictions_per_note in range(20, 65, 1):
        for prediction_start_offset in range(predictions_per_note):

            error, notes_and_rests = get_quantization_and_error(pitch_outputs_and_rests, predictions_per_note, prediction_start_offset, ideal_offset)
            if error < best_error:      
                best_error = error
                best_notes_and_rests = notes_and_rests
                best_predictions_per_note = predictions_per_note

    # At this point, best_notes_and_rests contains the best quantization.
    # Since we don't need to have rests at the beginning, let's remove these:
    while best_notes_and_rests[0] == 'Rest':
        best_notes_and_rests = best_notes_and_rests[1:]
    # Also remove silence at the end.
    while best_notes_and_rests[-1] == 'Rest':
        best_notes_and_rests = best_notes_and_rests[:-1]
    
    
    # Creating the sheet music score.
    sc = music21.stream.Score()
    # Adjust the speed to match the actual singing.
    bpm = 60 * 60 / best_predictions_per_note
    print ('bpm: ', bpm)
    a = music21.tempo.MetronomeMark(number=bpm)
    sc.insert(0,a)
    if (ts1!="0" and ts2!="0"):
        ts = music21.meter.TimeSignature(ts1+"/"+ts2)
        sc.insert(0, ts)
    if (sharps and flats):
        nums = int(sharps)
        numf = int(flats)
        if (nums == 0 and numf == 0):
            keysig = music21.key.KeySignature(0)
            sc.insert(0, keysig)
        elif (numf == 0):
            keysig = music21.key.KeySignature(nums)
            sc.insert(0, keysig)
        elif (nums == 0):
            keysig = music21.key.KeySignature(-1*numf)
            sc.insert(0, keysig)
        
    
    # sc.insert(0, ks2)
    # combine quarter notes to half
    notes_arr = [] 
    notetype_arr = []
    # notes_arr = best_notes_and_rests # COMMENT THIS
    i = 0
    while i < len(best_notes_and_rests)-1:
        snote = best_notes_and_rests[i]
        nextnote = best_notes_and_rests[i+1]
        if snote == nextnote:
            notes_arr.append(snote)
            notetype_arr.append('half')
            i+=2
        else:
            notes_arr.append(snote)
            notetype_arr.append('quarter')
            i+=1
    if i == len(best_notes_and_rests)-1:
        snote = best_notes_and_rests[i]
        notes_arr.append(snote)
        notetype_arr.append('quarter')
            
    # print(best_notes_and_rests)
    # print(notes_arr)
    # print(notetype_arr)        
        
    for i in range(len(notes_arr)):   
        d = notetype_arr[i]
        if notes_arr[i] == 'Rest':      
            sc.append(music21.note.Rest(type=d))
        else:
            sc.append(music21.note.Note(notes_arr[i], type=d))




    
    xml = open(sc.write('musicxml')).read()
    #save the file
    #return the url
    xml_filename = filename[:len(filename)-3] + "xml"
    f = "/tmp/" + xml_filename
    f1 = open(f, "w")
    f1.write(xml)
    f1.close()
    storage_client = storage.Client()
    bucket = storage_client.bucket("notes-analyzer-music-files")
    blob_xml = bucket.blob(xml_filename)

    blob_xml.upload_from_filename(f)
    blob = bucket.blob(filename)
    blob.delete()
    
    print(str(xml))
    headers = {
        'Access-Control-Allow-Origin': '*'
    }

    return (xml_filename, 200, headers)

    # return xml_filename