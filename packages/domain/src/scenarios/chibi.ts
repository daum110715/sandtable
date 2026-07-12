// DEV-005 纸面黄金场景：赤壁之战（公元 208 年冬）。
// 初始世界状态 + 三种颗粒度的改写样例（细 / 中 / 粗）。
// 场景与 CONTEXT.md 的 example dialogue、development-plan 的“那天江上刮西北风”一致。

import type { Rewrite } from "../events.js";
import type { WorldState } from "../world-state.js";
import {
  asFactionId,
  asLocationId,
  asPersonId,
  asRelationId,
  asResourceId,
  asSimulationTime,
  asWorldlineId,
} from "../ids.js";

export const chibiWorldlineId = asWorldlineId("chibi-208");
export const chibiInitialTime = asSimulationTime("208-11-winter");

// 阵营
const factionCao = asFactionId("faction-cao");
const factionSun = asFactionId("faction-sun");
const factionLiu = asFactionId("faction-liu");

// 人物
const personCaoCao = asPersonId("person-caocao");
const personSunQuan = asPersonId("person-sunquan");
const personLiuBei = asPersonId("person-liubei");
const personZhouYu = asPersonId("person-zhouyu");
const personZhuGeLiang = asPersonId("person-zhugeliang");
const personHuangGai = asPersonId("person-huanggai");
const personGuanYu = asPersonId("person-guanyu");
const personJiaXu = asPersonId("person-jiaxu");

// 地点
const locationChiBi = asLocationId("location-chibi");
const locationWuLin = asLocationId("location-wulin");
const locationXiaKou = asLocationId("location-xiakou");
const locationChaiSang = asLocationId("location-chaisang");
const locationXuChang = asLocationId("location-xuchang");

// 资源
const resourceCaoFleet = asResourceId("resource-cao-fleet");
const resourceSunFleet = asResourceId("resource-sun-fleet");
const resourceWind = asResourceId("resource-wind");

// 关系
const relationSunLiuAlliance = asRelationId("relation-sunliu-alliance");
const relationCaoSun = asRelationId("relation-cao-sun");
const relationCaoLiu = asRelationId("relation-cao-liu");

export const chibiInitialState: WorldState = {
  worldlineId: chibiWorldlineId,
  simulationTime: chibiInitialTime,
  factions: {
    [factionCao]: { id: factionCao, name: "曹军", leaderId: personCaoCao, strength: 220000 },
    [factionSun]: { id: factionSun, name: "孙权军", leaderId: personSunQuan, strength: 30000 },
    [factionLiu]: { id: factionLiu, name: "刘备军", leaderId: personLiuBei, strength: 20000 },
  },
  persons: {
    [personCaoCao]: { id: personCaoCao, name: "曹操", factionId: factionCao, role: "主公", locationId: locationWuLin, status: "在世" },
    [personSunQuan]: { id: personSunQuan, name: "孙权", factionId: factionSun, role: "主公", locationId: locationChaiSang, status: "在世" },
    [personLiuBei]: { id: personLiuBei, name: "刘备", factionId: factionLiu, role: "主公", locationId: locationXiaKou, status: "在世" },
    [personZhouYu]: { id: personZhouYu, name: "周瑜", factionId: factionSun, role: "都督", locationId: locationChaiSang, status: "在世" },
    [personZhuGeLiang]: { id: personZhuGeLiang, name: "诸葛亮", factionId: factionLiu, role: "军师", locationId: locationXiaKou, status: "在世" },
    [personHuangGai]: { id: personHuangGai, name: "黄盖", factionId: factionSun, role: "将领", locationId: locationChaiSang, status: "在世" },
    [personGuanYu]: { id: personGuanYu, name: "关羽", factionId: factionLiu, role: "将领", locationId: locationXiaKou, status: "在世" },
    [personJiaXu]: { id: personJiaXu, name: "贾诩", factionId: factionCao, role: "谋士", locationId: locationWuLin, status: "在世" },
  },
  locations: {
    [locationChiBi]: { id: locationChiBi, name: "赤壁", type: "水域" },
    [locationWuLin]: { id: locationWuLin, name: "乌林", type: "驻军" },
    [locationXiaKou]: { id: locationXiaKou, name: "夏口", type: "驻军" },
    [locationChaiSang]: { id: locationChaiSang, name: "柴桑", type: "驻军" },
    [locationXuChang]: { id: locationXuChang, name: "许昌", type: "都城" },
  },
  resources: {
    [resourceCaoFleet]: {
      id: resourceCaoFleet,
      name: "曹军战船",
      type: "fleet",
      quantity: 1000,
      owner: { kind: "faction", id: factionCao },
      locationId: locationWuLin,
      attributes: { chained: true },
    },
    [resourceSunFleet]: {
      id: resourceSunFleet,
      name: "吴军战船",
      type: "fleet",
      quantity: 300,
      owner: { kind: "faction", id: factionSun },
      locationId: locationChaiSang,
    },
    [resourceWind]: {
      id: resourceWind,
      name: "风向",
      type: "wind",
      quantity: 1,
      locationId: locationChiBi,
      attributes: { direction: "东南风" },
    },
  },
  relations: {
    [relationSunLiuAlliance]: {
      id: relationSunLiuAlliance,
      from: { kind: "faction", id: factionSun },
      to: { kind: "faction", id: factionLiu },
      type: "联盟",
      strength: 90,
    },
    [relationCaoSun]: {
      id: relationCaoSun,
      from: { kind: "faction", id: factionCao },
      to: { kind: "faction", id: factionSun },
      type: "敌对",
      strength: 100,
    },
    [relationCaoLiu]: {
      id: relationCaoLiu,
      from: { kind: "faction", id: factionCao },
      to: { kind: "faction", id: factionLiu },
      type: "敌对",
      strength: 100,
    },
  },
};

// 三种颗粒度的改写样例。
export const chibiRewrites = {
  fine: { text: "那天江上刮西北风", submittedAt: "2026-07-12T00:00:00.000Z" },
  medium: { text: "诸葛亮未借东风，火攻失效", submittedAt: "2026-07-12T00:00:01.000Z" },
  coarse: { text: "曹操采纳贾诩建议，退守许都", submittedAt: "2026-07-12T00:00:02.000Z" },
} satisfies Record<string, Rewrite>;
