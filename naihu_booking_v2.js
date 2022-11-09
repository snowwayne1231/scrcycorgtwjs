// Step3Action
/** 
 * 
 * i = { 羽球場1 : 83 , 羽球場2 : 84 , 羽球場3 : 1074 , 羽球場4 : 86 , 羽球場5 : 87 , 羽球場6 : 88}
 * ＴＡＢＬＥ LIST
 * https://scr.cyc.org.tw/tp12.aspx?module=net_booking&files=booking_place&StepFlag=2&PT=1&D=2022/04/20&D2=3
 * 預定場定圖
 * img/sche01.png
*/

const siteName = '內湖';
const bookingTimes = [18, 19];



const domain = 'scr.cyc.org.tw';
const tpsiteMap = {'南港': '02', '內湖': '12'};
const maxWorker = 5;
const idleSeconds = 25;
var timerMap = {};
var penddingQueue = [];
var penddingAjax = [];
// init
checkls(tpsiteMap[siteName], bookingTimes);


function pushQueue(tpsite, date, time, stage) {
    var url = '../tp' + tpsite + '.aspx?module=net_booking&files=booking_place&StepFlag=25&QPid=' + stage + '&QTime=' + time + '&PT=1&D=2022/' + date;
    console.log(`[場次] 加入排程 日期: ${date}, 時間: ${time}, 場地代號: ${stage}`);
    penddingQueue.push(url);
}

function lauchBooking() {
    if (penddingQueue.length == 0) { return false; }
    var url = penddingQueue.splice(-1, 1)[0];
    var dataset = url.split('25&Q')[1];
    penddingAjax.push(url);
    console.log(`[場次預訂] ${dataset} 請求中..`);
    return $.ajax({
        url,
        method: 'GET',
        success: (e) => {
            penddingAjax.splice(0, 1);
            console.log(`[場次預訂] ${dataset} 已經回應`, e);
            if (penddingAjax.length < maxWorker) {
                lauchBooking();
            }
        },
        error: (err) => {
            console.log('err: ', err);
            penddingAjax.splice(0, 1);
            window.open(url, '_blank');
        },
    });
}


function checkls(tpsite= '12', registerTimes=[15,16,17,18], instant=false) {
    var now = new Date();
    console.log(`開始偵測. [${siteName}] 現在時間 [ ${now.toLocaleTimeString()} ] 輪詢秒數: ${idleSeconds}`);
    now.setDate(now.getDate() + (tpsite == '12' ? 14 : 13));
    now.setSeconds(now.getSeconds() + (idleSeconds));
    const isBefore = now.getHours() == 23 && now.getMinutes() == 59;
    const isAfter = now.getHours() == 0 && now.getMinutes() <= 12;
    const gapTime = isBefore || isAfter ? (instant ? 1:200) : idleSeconds * 1000;
    

    var aryMorning = [];
    var aryAfteroon = [];
    var aryNight = [];
    registerTimes.map(t => {
        if (t < 12) { aryMorning.push(t); }
        if (12 <= t && t < 18) { aryAfteroon.push(t); }
        if (18 <= t) { aryNight.push(t); }
    });
    now.setMinutes(now.getMinutes() + 1);
    var date = `${String(now.getMonth()+1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
    var page = 4;
    while (page-- > 1) {
        var timeKey = `${tpsite}_${page}`;
        var _ary = aryMorning;
        if (page==2) { _ary = aryAfteroon; }
        else if (page==3) { _ary = aryNight; }
        if (_ary.length == 0) continue
        if (timerMap[timeKey]) {
            // window.clearTimeout(timerMap[timeKey]);
        } else {
            // timerMap[timeKey] = window.setTimeout(() => {
            //     ajaxCheckList(tpsite, date, page, _ary);
            // }, gapTime);
            timerMap[timeKey] = true;
            ajaxCheckList(tpsite, date, page, _ary, gapTime);
        }
    }
    return true;
}

function ajaxCheckList(tpsite = '12', date = '04/24', page = 2, allowedTimes = [15,16,17], gapTime) {
    window.setTimeout(() => {
        console.log(`檢測日期: ${date}  頁數: ${page} 場次時段: ${allowedTimes.join(',')}`);
        return $.ajax({
            url: `https://${domain}/tp${tpsite}.aspx?module=net_booking&files=booking_place&StepFlag=2&PT=1&D=2022/${date}&D2=${page}`,
            method: 'GET',
            success: (cxt) => {
                timerMap[`${tpsite}_${page}`] = null;
                var hasBtn = String(cxt).match(/img\/sche01.png(.*?)\)\}/gi);
                // console.log('hasBtn: ',hasBtn);
                if (hasBtn && hasBtn.length > 0) {
                    var res = hasBtn.map(e => {
                        var ary = e.split('Step3Action');
                        var left = ary[1].replace(/[\(\)\{\}]+/ig, '');
                        var stageTime = left.split(',').map(e => parseInt(e));
                        var time = stageTime[1];
                        var stage = stageTime[0];
                        console.log(`發現可訂時段: ${time}  場次: ${stage}`);
                        return {tpsite, date, time, stage};
                    }).filter(r => allowedTimes.includes(r.time));
                    res.sort((a,b) => {
                        var eqSt = a.stage == b.stage;
                        return eqSt ? a.time - b.time : b.stage - a.stage;
                    });
                    res.map(r => { pushQueue(r.tpsite, r.date, r.time, r.stage) });
                    if (gapTime <= 100000) {
                        new Array(maxWorker).fill(0).map(i => {
                            lauchBooking();
                        });
                    }
                } else {
                    console.log(`場次時段 [ ${allowedTimes.join(',')} ] 未發現可定場次`);
                }
                var now = new Date();
                checkls(tpsite, allowedTimes, now.getHours() + now.getMinutes() == 0);
                return false;
            },
            error: (evt) => {
                if (penddingQueue.length == 0) {
                    console.log('Timeout!!!. Just do it!!!');
                    const stages = [87, 1074, 88, 86];
                    const res = [];
                    bookingTimes.map(time => {
                        stages.map(stage => {
                            res.push({tpsite, date, stage, time});
                        });
                    });
                    res.map(r => { pushQueue(r.tpsite, r.date, r.time, r.stage) });
                    new Array(maxWorker).fill(0).map(i => {
                        lauchBooking();
                    });
                }
                var now = new Date();
                checkls(tpsite, allowedTimes, now.getHours() + now.getMinutes() == 0);
            },
            timeout: 5500,
        });
    }, gapTime);
}
