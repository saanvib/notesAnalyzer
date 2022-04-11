const button1 = document.getElementById('button1');
const player = document.getElementById('player');
const playerDiv = document.getElementById('player-div');
const analyzeButton = document.getElementById('analyze');
const analyzeDiv = document.getElementById('analyze-div');
const analyzeSuccessDiv = document.getElementById('analyze-success');
const iconDiv = document.getElementById('record_control');
const buttonText = document.getElementById('button-text');
const downloadLink = document.getElementById('download-link');
const analyzeIcon = document.getElementById('analyze-icon');

var fileurl;
var file;
const handleSuccess = function(stream) {
  const options = {mimeType: 'audio/webm'};
  var recordedChunks = [];
  var mediaRecorder = new MediaRecorder(stream, options);

  mediaRecorder.addEventListener('dataavailable', function(e) {
    if (e.data.size > 0) recordedChunks.push(e.data);
  });

  mediaRecorder.addEventListener('stop', function() {
    file = new Blob(recordedChunks);
    fileurl = URL.createObjectURL(file);
    player.src = fileurl;
    //var a = document.createElement('a');
    downloadLink.href = fileurl;
    downloadLink.download = "wavefile.wav"
   downloadLink.style = "display: inline-block";
  });

  function stopRecording() {
    mediaRecorder.stop();
    iconDiv.classList.remove("fa-circle-stop");
    iconDiv.classList.add("fa-microphone");
    playerDiv.style = "display: inline-block";
    buttonText.innerHTML = "Start Recording";
    
    analyzeDiv.style = "display: inline-block";
    button1.removeEventListener('click', stopRecording);
    button1.addEventListener('click', startRecording);
    
  }


  function startRecording() {  

    recordedChunks = [];
    mediaRecorder.start();
    iconDiv.classList.remove("fas", "fa-microphone");
    iconDiv.classList.add("fas", "fa-circle-stop");
    buttonText.innerHTML = "Stop Recording";
    button1.removeEventListener('click', startRecording);
    button1.addEventListener('click', stopRecording);
    playerDiv.style = "display: none";
    analyzeDiv.style = "display: none";
    analyzeSuccessDiv.innerHTML = "";
    downloadLink.style = "display: none";
    
  }

  // button2.addEventListener('click', stopRecording);

    button1.addEventListener('click', startRecording);

    analyzeButton.addEventListener('click', function() {
      uploadFile(file);
      
    })
    
    // mediaRecorder.start();
  };

  function analyzeFile(filename) {
    // 
    analyzeIcon.classList.remove("fa-sliders");
    analyzeIcon.classList.add("fa-spinner", "fa-pulse");
    var functionUrl = "https://us-central1-notes-analyzer.cloudfunctions.net/analyze_file?filename=" + filename;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", functionUrl);     
      
    xhr.setRequestHeader("Accept", "application/json");
    
    xhr.onreadystatechange = function () {
   if (xhr.readyState === 4  && xhr.status === 200) {
    var openSheetMusicDisplay = new opensheetmusicdisplay.OpenSheetMusicDisplay("analyze-success", { 
      backend: "svg", 
      drawFromMeasureNumber: 1,
      drawUpToMeasureNumber: Number.MAX_SAFE_INTEGER, // draw all measures, up to the end of the sample
      drawingParameters: "compact",
      drawPartNames: false
      });
      openSheetMusicDisplay
      .load("https://storage.googleapis.com/notes-analyzer-music-files/" + xhr.responseText)
      .then(
      function() {
      window.osmd = openSheetMusicDisplay; // give access to osmd object in Browser console, e.g. for osmd.setOptions()  
    
      //console.log("e.target.result: " + e.target.result);
      openSheetMusicDisplay.render();
      deleteXMLFile("https://storage.googleapis.com/notes-analyzer-music-files/" + xhr.responseText);
      }
      );
    // alert(xhr.responseText);
    analyzeIcon.classList.remove("fa-spinner", "fa-pulse");
    analyzeIcon.classList.add("fa-sliders");
    
    //  var x = document.createElement("h6");
    //  x.innerHTML = xhr.responseText;
    //  analyzeSuccess.appendChild(x);
      console.log(xhr.responseText);
      
   }};
   xhr.send(null);

  }
  function deleteXMLFile(url) {
    var xhr = new XMLHttpRequest();
    xhr.open("DELETE", url);   
    xhr.send();
  }
  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(handleSuccess);

  function uploadFile(file) {
    var BUCKET_NAME = "notes-analyzer-music-files"
    
    var i = Math.floor(Math.random() * 1000000);
    var OBJECT_NAME = i + ".wav";
    var url = "https://storage.googleapis.com/" + BUCKET_NAME + "/" + OBJECT_NAME;

      var xhr = new XMLHttpRequest();
      xhr.open("PUT", url);     
      
      xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", "audio/webm");
    
    xhr.onreadystatechange = function () {
   if (xhr.readyState === 4) {
     analyzeFile(OBJECT_NAME);
      console.log(xhr.responseText);
   }};

   var formData = new FormData();
   formData.append("thefile", file);
   xhr.send(file);



  }
      
