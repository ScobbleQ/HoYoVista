import { Games } from '../hoyo/utils/constants.js';

export const GameIcons = Object.freeze({
  [Games.GENSHIN]: '<:GenshinImpact:1277004066794242220>',
  [Games.STARRAIL]: '<:HonkaiStarRail:1277004079226294363>',
  [Games.HONKAI]: '<:HonkaiImpact3rd:1277004050356764702>',
  [Games.ZZZ]: '<:ZenlessZoneZero:1277004094070063134>',
});

export const Toggles = Object.freeze({
  true: '<:TOGGLE_ON:1321574686617767986>',
  false: '<:TOGGLE_OFF:1321574709225324605>',
});

export const GenshinCommission = Object.freeze({
  TaskRewardStatusTakenAward: '<:AttendanceRewardStatusTakenAward:1469542272273219614>', // DC-Done
  TaskRewardStatusUnfinished: '<:TaskRewardStatusUnfinished:1469542270301638820>', // DC-Not Done
  AttendanceRewardStatusTakenAward: '<:AttendanceRewardStatusTakenAward:1469542272273219614>', // EC-Done
  AttendanceRewardStatusUnfinished: '<:lightnotcomplete:1472974821351493702>', // EC-Not Done
  AttendanceRewardStatusWaitTaken: '<:lightnotreward:1472974822374903950>', // EC-Done but not claimed
  AttendanceRewardStatusFinishedNonReward: '<:lightnotcomplete:1472974821351493702>', // EC-Done but no reward
  SEP: '<:EncounterPoint:1469545256553812199>',
});

export const StygianDifficulty = Object.freeze({
  0: '<:UI_LeyLineChallenge_Medal_0:1457950382625132654>',
  1: '<:UI_LeyLineChallenge_Medal_1:1457950384088940594>',
  2: '<:UI_LeyLineChallenge_Medal_2:1457950385389179055>',
  3: '<:UI_LeyLineChallenge_Medal_3:1457950388006420501>',
  4: '<:UI_LeyLineChallenge_Medal_4:1457950389646131232>',
  5: '<:UI_LeyLineChallenge_Medal_5:1457950391302885417>',
  6: '<:UI_LeyLineChallenge_Medal_6:1457950393224007875>',
});

export const IncomeReportImage = Object.freeze({
  [Games.GENSHIN]:
    'https://webstatic.hoyoverse.com/upload/op-public/2022/08/04/ff1419346528dfd64d77c35701ecd106_7596171599082743274.png?x-oss-process=image%2Fresize%2Cs_600%2Fauto-orient%2C0%2Finterlace%2C1%2Fformat%2Cwebp%2Fquality%2Cq_70',
  [Games.ZZZ]:
    'https://upload-os-bbs.hoyolab.com/upload/2024/12/06/4f283743ae4da85071ffa411fd17413a_5969617490706496877.png?x-oss-process=image/auto-orient,0/interlace,1/format,webp/quality,q_70',
});
