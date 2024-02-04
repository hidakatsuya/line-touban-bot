import { LineMember } from "./line";

export class Touban {
  private members: LineMember[];

  constructor(members: LineMember[]) {
    this.members = members;
  }

  get today(): LineMember {
    return this.getToubanAt(0);
  }

  get tomorrow(): LineMember {
    return this.getToubanAt(1);
  }

  private getToubanAt(dayAdd: number): LineMember {
    const today = new Date();
    const day = today.getDate() + dayAdd;
    return this.members[day % this.members.length];
  }
}
