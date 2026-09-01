export type MemberStatus = "Vérifié" | "Non Vérifié";

export interface Member {
  serial: string;
  name: string;
  role: string;
  status: MemberStatus;
  joined: string;
}

export const members: Member[] = [
  {
    serial: "LF-0001",
    name: "Tuyisenge Bonaventure",
    role: "Président Fondateur",
    status: "Vérifié",
    joined: "2024-03-12",
  },
  {
    serial: "LF-0002",
    name: "Iradukunda Grace",
    role: "Vice-Présidente",
    status: "Vérifié",
    joined: "2024-04-02",
  },
  {
    serial: "LF-0003",
    name: "Mugisha Patrick",
    role: "Secrétaire Général",
    status: "Vérifié",
    joined: "2024-05-18",
  },
  {
    serial: "LF-0004",
    name: "Uwase Diane",
    role: "Trésorière",
    status: "Non Vérifié",
    joined: "2024-07-09",
  },
  {
    serial: "LF-0005",
    name: "Nshimiyimana Eric",
    role: "Coordinateur des activités",
    status: "Non Vérifié",
    joined: "2024-08-01",
  },
];
