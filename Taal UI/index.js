const button1 = document.getElementById('button1');

const playerDiv = document.getElementById('player-div');
const analyzeButton = document.getElementById('analyze');
const analyzeDiv = document.getElementById('analyze-div');
const analyzeSuccessDiv = document.getElementById('analyze-success');
// const iconDiv = document.getElementById('record_control');
const buttonText = document.getElementById('button-text');
const downloadLink = document.getElementById('download-link');
const analyzeContainer = document.getElementById('analyze-container');
const helpButton = document.getElementById('helpbutton');
const closeX = document.getElementById('closex');
const closeButton = document.getElementById('closebutton');
const uploadedFile = document.getElementById('upload');
var audio;
var fileurl;
var file;
const handleSuccess = function(stream) {
  const options = {mimeType: 'audio/webm'};
  var recordedChunks = [];
  var mediaRecorder = new MediaRecorder(stream, options);

  helpButton.addEventListener('click', function() {
    console.log("help button clicked");
    document.getElementById("helpModal").style.display="block";
  })

  closeX.addEventListener('click', function() {
    document.getElementById("helpModal").style.display="none";
  })

  function handleFiles(event) {
    var files = event.target.files;
    file = files[0];
    fileurl = URL.createObjectURL(files[0]);
    audio = new Audio(
      fileurl
    );
    initialize_audio_player();
    // document.getElementById("audio").load();

      console.log("download file " + fileurl);
    //player.src = fileurl;
    //var a = document.createElement('a');
    downloadLink.href = fileurl;
    downloadLink.download = "wavefile.wav";
    downloadLink.style = "display: inline-block";
    analyzeContainer.style = "display:block";
  }

  uploadedFile.addEventListener("change", handleFiles, false);

  closeButton.addEventListener('click', function() {
    document.getElementById("helpModal").style.display="none";
  })

  mediaRecorder.addEventListener('dataavailable', function(e) {
    if (e.data.size > 0) recordedChunks.push(e.data);
  });

  mediaRecorder.addEventListener('stop', function() {
    file = new Blob(recordedChunks);
    fileurl = URL.createObjectURL(file);

    audio = new Audio(
      fileurl
    );
    initialize_audio_player();

    //player.src = fileurl;
    //var a = document.createElement('a');
    downloadLink.href = fileurl;
    downloadLink.download = "wavefile.wav"
    downloadLink.style = "display: inline-block";
  });

  function stopRecording() {
    mediaRecorder.stop();
    // iconDiv.classList.remove("fa-circle-stop");
    // iconDiv.classList.add("fa-microphone");
    playerDiv.style = "display: inline-block";
    // buttonText.innerHTML = "Start Recording";
    button1.style.backgroundImage = "url('assets/start_button.svg')";
    analyzeContainer.style = "display:block";
    button1.removeEventListener('click', stopRecording);
    button1.addEventListener('click', startRecording);
    downloadLink.style = "display: inline-block";
  }


  function startRecording() {  

    recordedChunks = [];
    mediaRecorder.start();
    // iconDiv.classList.remove("fas", "fa-microphone");
    // iconDiv.classList.add("fas", "fa-circle-stop");
    // buttonText.innerHTML = "Stop Recording";
    button1.style.backgroundImage = "url('assets/stop_button.svg')";

    button1.removeEventListener('click', startRecording);
    button1.addEventListener('click', stopRecording);
    playerDiv.style = "display: none";
    analyzeContainer.style = "display: none";
    analyzeSuccessDiv.innerHTML = "";
    downloadLink.style = "display: none";
    
  }

  // button2.addEventListener('click', stopRecording);

    button1.addEventListener('click', startRecording);

    analyzeButton.addEventListener('click', function() {
      analyzeSuccessDiv.innerHTML = "<center><div>Analyzing audio recording...</div><br><img src='assets/loader.gif'></center>";
      uploadFile(file);
      
    })
    
    // mediaRecorder.start();
  };



  function analyzeFile(filename) {
    // 
    // analyzeIcon.classList.remove("fa-sliders");
    // analyzeIcon.classList.add("fa-spinner", "fa-pulse");
    // var functionUrl = "/cors-proxy/us-central1-notes-analyzer.cloudfunctions.net/analyze_file?filename=" + filename;
    var functionUrl = "https://us-central1-notes-analyzer.cloudfunctions.net/analyze_file?filename=" + filename;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", functionUrl);     
      
    xhr.setRequestHeader("Accept", "application/json");
    
    xhr.onreadystatechange = function () {
   if (xhr.readyState === 4  && xhr.status === 200) {
    analyzeSuccessDiv.innerHTML = "";
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
      // deleteXMLFile("/cors-proxy/storage.googleapis.com/notes-analyzer-music-files/" + xhr.responseText);
      deleteXMLFile("https://storage.googleapis.com/notes-analyzer-music-files/" + xhr.responseText);
      }
      );
    // alert(xhr.responseText);
    // analyzeIcon.classList.remove("fa-spinner", "fa-pulse");
    // analyzeIcon.classList.add("fa-sliders");
    
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
    // var url = "/cors-proxy/storage.googleapis.com/" + BUCKET_NAME + "/" + OBJECT_NAME;

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

  function helpPopup() {
    // open a new window popup with text -- can do this as an alert too if we want

  }
      
