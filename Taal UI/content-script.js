var fileurl;
var file;

var s = document.createElement('script');
s.src = chrome.runtime.getURL('injected-script.js');
var t = document.createElement('script');
t.src = chrome.runtime.getURL('opensheetmusicdisplay.min.js');


(document.head || document.documentElement).appendChild(s);
(document.head || document.documentElement).appendChild(t);

function analyzeFile(filename) {
    
    // var functionUrl = "/cors-proxy/us-central1-notes-analyzer.cloudfunctions.net/analyze_file?filename=" + filename;
    var functionUrl = "https://us-central1-notes-analyzer.cloudfunctions.net/analyze_file?filename=" + filename;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", functionUrl);     
      
    xhr.setRequestHeader("Accept", "application/json");
    
    xhr.onreadystatechange = function () {
   if (xhr.readyState === 4  && xhr.status === 200) {
    analyzeSuccessDiv = document.createElement('div');
    analyzeSuccessDiv.style.width = "720px";
    analyzeSuccessDiv.id = "analyze-success";
    musiccontainer = document.getElementsByClassName("replay-section");
    musicdiv = musiccontainer[0];
    musicdiv.appendChild(analyzeSuccessDiv);
    analyzeSuccessDiv.innerHTML = "";
    var openSheetMusicDisplay = new opensheetmusicdisplay.OpenSheetMusicDisplay("analyze-success", { 
      backend: "svg", 
      drawFromMeasureNumber: 1,
      autoResize: true,
      drawUpToMeasureNumber: Number.MAX_SAFE_INTEGER, // draw all measures, up to the end of the sample
      drawingParameters: "compact",
      drawPartNames: false
      });
      openSheetMusicDisplay
      .load("https://storage.googleapis.com/notes-analyzer-music-files/" + xhr.responseText)
      .then(
      function() {
      window.osmd = openSheetMusicDisplay; // give access to osmd object in Browser console, e.g. for osmd.setOptions()  
    
      openSheetMusicDisplay.render();
      deleteXMLFile("https://storage.googleapis.com/notes-analyzer-music-files/" + xhr.responseText);
      }
      );
    
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

  function uploadFile() {
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
    console.log("Calling analyzefile");
     analyzeFile(OBJECT_NAME);
      console.log(xhr.responseText);
   }};

   var formData = new FormData();
   formData.append("thefile", file);
   xhr.send(file);



  }

window.addEventListener("message", function (event) {
    if (event.data.type && (event.data.type == "audio-file-url")) {
        console.log("content script received: " + event.data.value);
        audioFileUrl = event.data.value;
        // i = audioFileUrl.indexOf(".wav");

        // result = audioFileUrl.slice(0,i+4);
        // result = result.slice(7);
        
        result = audioFileUrl.slice(7);
        result = result.slice(0, result.length-1);
        console.log(result);
        
        fetch(result)
    .then((res) => { return res.blob(); })
    .then((data) => {
        if (data)
          console.log("file fetched");
          file = data;
          uploadFile();
    });
    }
});