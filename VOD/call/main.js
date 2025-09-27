const APP_ID = "f3858cfbbe204a14b316640bcb08ec55"
const TOKEN = "007eJxTYPD9l5rAeFEyXPFkys8/9w30g934Ha+Em3Fa69xfZVC78agCQ5qxhalFclpSUqqRgUmioUmSsaGZmYlBUnKSgUVqsqnpmZQbGQ2BjAz3HxYwMEIhiM/KEJSfn2vIwAAAIOMfeA=="
const CHANNEL = "Room1"

const client = AgoraRTC.createClient({mode:'rtc', codec:'vp8'})

let localTracks = []
let remoteUsers = {}
let screenTrack = null

let joinAndDisplayLocalStream = async () => {
    client.on('user-published', handleUserJoined)
    client.on('user-left', handleUserLeft)

    let UID = await client.join(APP_ID, CHANNEL, TOKEN, null)

    let micTrack, camTrack
    try {
        micTrack = await AgoraRTC.createMicrophoneAudioTrack()
    } catch (err) {
        console.warn("אין גישה למיקרופון")
    }

    try {
        camTrack = await AgoraRTC.createCameraVideoTrack()
    } catch (err) {
        console.warn("אין גישה למצלמה")
    }

    localTracks = [micTrack, camTrack].filter(track => track)

    // מצלמה
    if (camTrack) {
        let player = `<div class="video-container" id="user-container-${UID}">
                          <div class="video-player" id="user-${UID}"></div>
                      </div>`
        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player)
        camTrack.play(`user-${UID}`)

        document.getElementById('camera-btn').innerText = "Camera on"
        document.getElementById('camera-btn').disabled = false
        document.getElementById('camera-btn').style.backgroundColor = "cadetblue"
    } else {
        document.getElementById('camera-btn').innerText = "Camera off"
        document.getElementById('camera-btn').disabled = true
        document.getElementById('camera-btn').style.backgroundColor = "#aaa"
    }

    // מיקרופון
    if (micTrack) {
        document.getElementById('mic-btn').innerText = "Mic on"
        document.getElementById('mic-btn').disabled = false
        document.getElementById('mic-btn').style.backgroundColor = "cadetblue"
    } else {
        document.getElementById('mic-btn').innerText = "Mic off"
        document.getElementById('mic-btn').disabled = true
        document.getElementById('mic-btn').style.backgroundColor = "#aaa"
    }

    if (localTracks.length > 0) {
        await client.publish(localTracks)
    }
}

let joinStream = async () => {
    await joinAndDisplayLocalStream()
    document.getElementById('join-btn').style.display = 'none'
    document.getElementById('stream-controls').style.display = 'flex'
}

let handleUserJoined = async (user, mediaType) => {
    remoteUsers[user.uid] = user 
    await client.subscribe(user, mediaType)

    if (mediaType === 'video'){
        let player = document.getElementById(`user-container-${user.uid}`)
        if (player != null){
            player.remove()
        }

        player = `<div class="video-container" id="user-container-${user.uid}">
                        <div class="video-player" id="user-${user.uid}"></div> 
                 </div>`
        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player)

        user.videoTrack.play(`user-${user.uid}`)
    }

    if (mediaType === 'audio'){
        user.audioTrack.play()
    }
}

let handleUserLeft = async (user) => {
    delete remoteUsers[user.uid]
    document.getElementById(`user-container-${user.uid}`).remove()
}

let leaveAndRemoveLocalStream = async () => {
    for(let i = 0; localTracks.length > i; i++){
        localTracks[i].stop()
        localTracks[i].close()
    }

    if(screenTrack){
        await client.unpublish(screenTrack)
        screenTrack.close()
        screenTrack = null
    }

    await client.leave()
    document.getElementById('join-btn').style.display = 'block'
    document.getElementById('stream-controls').style.display = 'none'
    document.getElementById('video-streams').innerHTML = ''
}

let toggleMic = async (e) => {
    if (localTracks[0].muted){
        await localTracks[0].setMuted(false)
        e.target.innerText = 'Mic on'
        e.target.style.backgroundColor = 'cadetblue'
    }else{
        await localTracks[0].setMuted(true)
        e.target.innerText = 'Mic off'
        e.target.style.backgroundColor = '#EE4B2B'
    }
}

let toggleCamera = async (e) => {
    if(localTracks[1].muted){
        await localTracks[1].setMuted(false)
        e.target.innerText = 'Camera on'
        e.target.style.backgroundColor = 'cadetblue'
    }else{
        await localTracks[1].setMuted(true)
        e.target.innerText = 'Camera off'
        e.target.style.backgroundColor = '#EE4B2B'
    }
}

let toggleScreen = async (e) => {
    if(!screenTrack){
        try{
            screenTrack = await AgoraRTC.createScreenVideoTrack({}, "auto");
            let UID = "screen-user";
            let player = `<div class="video-container" id="user-container-${UID}">
                              <div class="video-player" id="user-${UID}"></div>
                          </div>`;
            document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);
            screenTrack.play(`user-${UID}`);
            await client.publish(screenTrack);

            e.target.innerText = "Stop Sharing";
            e.target.style.backgroundColor = "#EE4B2B";

            screenTrack.on("track-ended", () => stopScreenShare(e));
        } catch(err){
            console.warn("שיתוף מסך נכשל:", err);
        }
    } else {
        stopScreenShare(e);
    }
}

let stopScreenShare = async (e) => {
    if(!screenTrack) return;
    await client.unpublish(screenTrack);
    screenTrack.close();
    screenTrack = null;

    let screenContainer = document.getElementById("user-container-screen-user");
    if(screenContainer) screenContainer.remove();

    e.target.innerText = "Share Screen";
    e.target.style.backgroundColor = "cadetblue";
}

// Event listeners
document.getElementById('join-btn').addEventListener('click', joinStream)
document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream)
document.getElementById('mic-btn').addEventListener('click', toggleMic)
document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('screen-btn').addEventListener('click', toggleScreen)
