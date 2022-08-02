var fileurl;
var file;
var musicdiv;

window.addEventListener ("load", myMain, false);

function myMain (evt) {
    var jsInitChecktimer = setInterval (checkForJS_Finish, 111);

    function checkForJS_Finish () {
        musiccontainer = document.getElementsByClassName("replay-section");
        if (musiccontainer.length > 0) {
            clearInterval (jsInitChecktimer);
            // console.log(musiccontainer.length);
            // console.log(musiccontainer);
            musicdiv = musiccontainer[0];
            // console.log(c);
            btn = document.createElement("button");
            
            btn.innerHTML = "Analyze Student Audio";

            musicdiv.appendChild(btn);
            btn.addEventListener("click", function () {
    audioFileUrl = JSON.stringify(window.api.sessionData.audioFileUrl);

    window.postMessage({type:"audio-file-url", value:audioFileUrl});
    console.log("inject posted " + audioFileUrl);

    // fetch(window.api.sessionData.audioFileUrl)
    // .then((res) => { return res.blob(); })
    // .then((data) => {
    //     file = data;
    //     uploadFile();
    // });
    });

        }
    }
}

// console.log(musiccontainer.length);
// console.log(musiccontainer);
// c = musiccontainer[0];
// console.log(c);


