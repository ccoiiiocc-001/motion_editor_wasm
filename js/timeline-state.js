const whitePlayhead=document.getElementById('whitePlayhead');
const yellowPlayhead=document.getElementById('yellowPlayhead');
const blueGuidelinesLayer=document.getElementById('blueGuidelinesLayer');
const timelineProgress=document.getElementById('timelineProgress');
const currentTimeText=document.getElementById('currentTimeText');
const durationText=document.getElementById('durationText');
const timelinePlayBtn=document.getElementById('timelinePlayBtn');
const timelineStopBtn=document.getElementById('timelineStopBtn');
const timelineBar=document.getElementById('timelineBar');
const timelineTracks=document.getElementById('timelineTracks');
const timelineZoom=document.getElementById('timelineZoom');
const zoomInBtn=document.getElementById('zoomInBtn');
const zoomOutBtn=document.getElementById('zoomOutBtn');
const zoomPercentText=document.getElementById('zoomPercentText');
const trimLeftBtn=document.getElementById('trimLeftBtn');
const trimRightBtn=document.getElementById('trimRightBtn');
const rangeCutBtn=document.getElementById('rangeCutBtn');
const moveUpBtn=document.getElementById('moveUpBtn');
const moveDownBtn=document.getElementById('moveDownBtn');
const swapPrevBtn=document.getElementById('swapPrevBtn');
const swapNextBtn=document.getElementById('swapNextBtn');
const magnetStartBtn=document.getElementById('magnetStartBtn');
const magnetBackBtn=document.getElementById('magnetBackBtn');
const magnetAllBtn=document.getElementById('magnetAllBtn');
const deleteBlueGuidelineBtn=document.getElementById('deleteBlueGuidelineBtn');
const timelineRuler=document.getElementById('timelineRuler');
const timelineScrollbar=document.getElementById('timelineScrollbar');
const timelineScrollThumb=document.getElementById('timelineScrollThumb');
const defaultZoomSelect=document.getElementById('defaultZoomSelect');
const SNAP_DISTANCE=0.15;
let isDraggingWhitePlayhead=false;
let MAX_TIMELINE_DURATION=parseInt(localStorage.getItem('timeline_max_duration'))||60*60*2;
let visibleTimelineDuration=MAX_TIMELINE_DURATION;
let timelineScrollX=0;
let currentTime=0;
window.getTimelineCurrentTime=function(){return currentTime;};
let previewTime=0;
let isTimelinePlaying=false;
let dragState=null;
let isDraggingYellow=false;
let isDraggingThumb=false;
let isRangeCutting=false;
let rangeCutStartTime=0;
window.lastSelectedObj=null;
let lastFrameTime=performance.now();
const TRACK_LAYOUT=[{type:'overlay',index:4,label:'OVERLAY 5'},{type:'overlay',index:3,label:'OVERLAY 4'},{type:'overlay',index:2,label:'OVERLAY 3'},{type:'overlay',index:1,label:'OVERLAY 2'},{type:'overlay',index:0,label:'OVERLAY 1'},{type:'background',index:0,label:'BACKGROUND'},{type:'audio',index:2,label:'AUDIO 3'},{type:'audio',index:1,label:'AUDIO 2'},{type:'audio',index:0,label:'AUDIO 1'}];
if(defaultZoomSelect){
    let savedZoom=localStorage.getItem('defaultZoom')||'5';
    defaultZoomSelect.value=savedZoom;
    if (!defaultZoomSelect.value) {
        defaultZoomSelect.value = '5';
        savedZoom = '5';
    }
    visibleTimelineDuration=MAX_TIMELINE_DURATION/parseInt(savedZoom,10);
    defaultZoomSelect.onchange=()=>{
        localStorage.setItem('defaultZoom',defaultZoomSelect.value);
        visibleTimelineDuration=MAX_TIMELINE_DURATION/parseInt(defaultZoomSelect.value,10);
        if(typeof window.updateTimelineUI==='function')window.updateTimelineUI();
        if(typeof window.renderTracks==='function')window.renderTracks();
    };
}
const timelineMaxDurationSelect = document.getElementById('timelineMaxDurationSelect');
if (timelineMaxDurationSelect) {
    timelineMaxDurationSelect.value = MAX_TIMELINE_DURATION.toString();
    timelineMaxDurationSelect.onchange = () => {
        const newDur = parseInt(timelineMaxDurationSelect.value, 10);
        MAX_TIMELINE_DURATION = newDur;
        localStorage.setItem('timeline_max_duration', newDur);
        const zoomVal = defaultZoomSelect ? parseInt(defaultZoomSelect.value, 10) : 5;
        visibleTimelineDuration = MAX_TIMELINE_DURATION / zoomVal;
        if (currentTime > MAX_TIMELINE_DURATION) {
            currentTime = MAX_TIMELINE_DURATION;
            previewTime = currentTime;
        }
        if (timelineScrollX > MAX_TIMELINE_DURATION - visibleTimelineDuration) {
            timelineScrollX = Math.max(0, MAX_TIMELINE_DURATION - visibleTimelineDuration);
        }
        if (typeof window.updateTimelineUI === 'function') window.updateTimelineUI();
        if (typeof window.renderTracks === 'function') window.renderTracks();
    };
}
window.trackMuteStates = JSON.parse(localStorage.getItem('shorts_track_mute_states')) || {};

Object.defineProperty(window, 'currentTime', {
    get: function() { return currentTime; },
    set: function(val) {
        currentTime = val;
        if (typeof window.updateTimelineUI === 'function') window.updateTimelineUI();
        if (typeof window.updateLayerVisibility === 'function') window.updateLayerVisibility();
    },
    configurable: true
});

Object.defineProperty(window, 'isTimelinePlaying', {
    get: function() { return isTimelinePlaying; },
    set: function(val) { isTimelinePlaying = val; },
    configurable: true
});