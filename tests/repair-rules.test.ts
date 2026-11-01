import { describe, expect, it } from "vitest";
import { demoIssues, demoUsers } from "../lib/demo/data";
import { confirmDemoRepair, demoLeaderboard, demoWorldIssues, emptyDemoRepairs, readDemoRepairs, reportDemoIssue, saveDemoRepairs } from "../lib/demo/repairs";
import { monsterPower } from "../lib/game/power";
import { isCommunityFixed, repairBonus, reportOrderBonus, voteWeight } from "../lib/roads/rules";

describe("vital weighted repair confirmation rules", () => {
  it("requires five points: a verified council vote weighs three, ordinary accounts weigh one", () => {
    expect(voteWeight([])).toBe(1);
    expect(voteWeight(["council", "admin", "Council_verified"])).toBe(1);
    expect(voteWeight(["council_verified"])).toBe(3);
    expect(isCommunityFixed(3)).toBe(false);
    expect(isCommunityFixed(4)).toBe(false);
    expect(isCommunityFixed(5)).toBe(true);
    expect(isCommunityFixed(6)).toBe(true);
    expect(repairBonus(60)).toBe(60);
    expect(repairBonus(110)).toBe(110);
    expect(repairBonus(170)).toBe(170);
    expect(() => repairBonus(171)).toThrow();
    expect(reportOrderBonus(1)).toBe(60);
    expect(reportOrderBonus(5)).toBe(20);
    expect(reportOrderBonus(6)).toBe(5);
    expect(() => reportOrderBonus(0)).toThrow();
  });

  it("starts the labelled mock world with sixty open issues, twenty users and seventy-five reports", () => {
    const fresh = emptyDemoRepairs();
    expect(demoIssues).toHaveLength(60);
    expect(demoUsers).toHaveLength(20);
    expect(demoUsers.filter(user => user.councilVerified)).toHaveLength(2);
    expect(demoIssues.reduce((sum, issue) => sum + issue.reporterIds.length, 0)).toBe(75);
    expect(demoWorldIssues(fresh).every(issue => issue.status === "open" && issue.confirmationPoints === 0 && issue.confirmationCount === 0)).toBe(true);
    expect(demoLeaderboard(fresh).reduce((sum, user) => sum + user.captures, 0)).toBe(75);
  });

  it("clears at 3+1+1 and gives each original reporter its frozen capture XP exactly once", () => {
    const issue = demoIssues[0];
    const council = demoUsers.find(user => user.councilVerified)!;
    const ordinary = demoUsers.filter(user => !user.councilVerified);
    const initial = emptyDemoRepairs();
    const originalLeaderboard = demoLeaderboard(initial);
    const three = confirmDemoRepair(initial, issue.id, council.id);
    expect(three.issue).toMatchObject({ status: "open", confirmationPoints: 3, confirmationCount: 1 });
    const four = confirmDemoRepair(three.state, issue.id, ordinary[0].id);
    expect(four.issue.status).toBe("open");
    const five = confirmDemoRepair(four.state, issue.id, ordinary[1].id);
    expect(five.issue).toMatchObject({ status: "community_fixed", confirmationPoints: 5, confirmationCount: 3 });
    expect(five.newlyCleared).toBe(true);
    const originalXp = monsterPower(issue.monsterProfile, issue.createdAtISO).captureXp;
    expect(five.rewardAwarded).toBe(issue.reporterIds.reduce((sum, _id, index) => sum + originalXp + reportOrderBonus(index + 1), 0));
    const rewarded = demoLeaderboard(five.state);
    for (const user of originalLeaderboard) {
      const reporterIndex = issue.reporterIds.indexOf(user.id);
      expect(rewarded.find(candidate => candidate.id === user.id)).toMatchObject({ captures: user.captures, xp: user.xp + (reporterIndex >= 0 ? originalXp + reportOrderBonus(reporterIndex + 1) : 0) });
    }
    const replay = confirmDemoRepair(five.state, issue.id, council.id);
    expect(replay).toMatchObject({ duplicate: true, newlyCleared: false, rewardAwarded: 0 });
    expect(replay.issue.confirmationPoints).toBe(5);
    const extraVote = confirmDemoRepair(replay.state, issue.id, ordinary[2].id);
    expect(extraVote.issue.confirmationPoints).toBe(6);
    expect(extraVote.rewardAwarded).toBe(0);
    expect(demoLeaderboard(extraVote.state)).toEqual(rewarded);
    let stored = "";
    expect(saveDemoRepairs({ setItem: (_key, value) => { stored = value; } }, extraVote.state)).toBeUndefined();
    expect(demoLeaderboard(readDemoRepairs({ getItem: () => stored }))).toEqual(rewarded);
  });

  it("allows two different verified mock council users to reach six points", () => {
    const issue = demoIssues[1];
    const councilUsers = demoUsers.filter(user => user.councilVerified);
    const first = confirmDemoRepair(emptyDemoRepairs(), issue.id, councilUsers[0].id);
    const second = confirmDemoRepair(first.state, issue.id, councilUsers[1].id);
    expect(second.issue).toMatchObject({ status: "community_fixed", confirmationPoints: 6, confirmationCount: 2 });
    expect(second.state.clearedIssueIds).toEqual([issue.id]);
  });

  it("rejects unknown mock identities and ignores forged cleared-state or replayed stored votes", () => {
    expect(() => confirmDemoRepair(emptyDemoRepairs(), "missing-issue", demoUsers[0].id)).toThrow();
    expect(() => confirmDemoRepair(emptyDemoRepairs(), demoIssues[0].id, "missing-user")).toThrow();
    const forged = { version: 1, votes: [], clearedIssueIds: [demoIssues[0].id] };
    expect(readDemoRepairs({ getItem: () => JSON.stringify(forged) })).toEqual(emptyDemoRepairs());
    const first = confirmDemoRepair(emptyDemoRepairs(), demoIssues[0].id, demoUsers[0].id).state;
    expect(readDemoRepairs({ getItem: () => JSON.stringify({ ...first, votes: [...first.votes, first.votes[0]] }) })).toEqual(emptyDemoRepairs());
  });

  it("adds one mock corroboration per actor, freezes reporter order and persists it without replay XP", () => {
    const issue = demoIssues[0];
    const actor = demoUsers.find(user => !issue.reporterIds.includes(user.id))!;
    const initial = emptyDemoRepairs();
    const before = demoLeaderboard(initial).find(user => user.id === actor.id)!;
    const result = reportDemoIssue(initial, issue.id, actor.id);
    expect(result.reporterOrdinal).toBe(issue.reporterIds.length + 1);
    expect(result.bonusXp).toBe(reportOrderBonus(result.reporterOrdinal));
    expect(result.issue.reporterIds).toEqual([...issue.reporterIds, actor.id]);
    expect(demoLeaderboard(result.state).find(user => user.id === actor.id)).toMatchObject({ captures: before.captures + 1, xp: before.xp + monsterPower(issue.monsterProfile, issue.createdAtISO).captureXp + result.bonusXp });
    const replay = reportDemoIssue(result.state, issue.id, actor.id);
    expect(replay).toMatchObject({ duplicate: true, bonusXp: 0, reporterOrdinal: result.reporterOrdinal });
    expect(demoLeaderboard(replay.state)).toEqual(demoLeaderboard(result.state));
    let raw = "";
    saveDemoRepairs({ setItem: (_key, value) => { raw = value; } }, result.state);
    expect(readDemoRepairs({ getItem: () => raw }).additionalReporters).toEqual([{ issueId: issue.id, userId: actor.id }]);
    expect(() => reportDemoIssue(initial, "missing", actor.id)).toThrow();
  });
});
