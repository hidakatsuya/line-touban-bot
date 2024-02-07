import { LineMember } from "./line";

function getTodayJSTDate(): Date {
  const date = new Date();
  date.setHours(date.getHours() + 9);
  return date;
}

function replyTemplate(
  strings: TemplateStringsArray,
  ...keys: string[]
): (values: Record<string, string>) => string {
  return (values: Record<string, string>): string => {
    const result = [strings[0]];

    keys.forEach((key, i) => {
      const value = values[key];
      result.push(value, strings[i + 1]);
    });
    return result.join("");
  };
}

export interface ToubanConfig {
  name: string;
  description: string;
}

export class Touban {
  private replayTemplate =
    replyTemplate`${"when"}の${"touban"}は\n「${"member"}」です。`;

  private config: ToubanConfig;
  private members: LineMember[];

  constructor(members: LineMember[], config: ToubanConfig) {
    this.members = members;
    this.config = config;
  }

  get today(): string {
    return this.replayTemplate({
      when: "今日",
      touban: this.config.name,
      member: this.getToubanAt(0).name,
    });
  }

  get tomorrow(): string {
    return this.replayTemplate({
      when: "明日",
      touban: this.config.name,
      member: this.getToubanAt(1).name,
    });
  }

  get description(): string {
    return this.config.description;
  }

  private getToubanAt(dayAdd: number): LineMember {
    const today = getTodayJSTDate();
    const day = today.getDate() + dayAdd;
    console.log("today", today);
    return this.members[day % this.members.length];
  }
}
