import { describe, expect, test } from "vitest";
import { LineMember } from "../src/line";
import { Touban } from "../src/touban";

describe("Touban", () => {
  const members: LineMember[] = [
    new LineMember("John Doe"),
    new LineMember("Jane Smith"),
    new LineMember("Alice Johnson"),
  ];

  const config = {
    name: "Touban",
    description: "Touban description",
  };
  const currentDate = new Date("2024-01-03");

  test("today", () => {
    const touban = new Touban(members, config, currentDate);
    const expected = `今日のToubanは\n「${members[0].name}」です。`;
    expect(touban.today).toBe(expected);
  });

  test("tomorrow", () => {
    const touban = new Touban(members, config, currentDate);
    const expected = `明日のToubanは\n「${members[1].name}」です。`;
    expect(touban.tomorrow).toBe(expected);
  });

  test("description", () => {
    const touban = new Touban(members, config);
    expect(touban.description).toBe(config.description);
  });
});
