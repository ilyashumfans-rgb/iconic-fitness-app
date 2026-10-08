export type CallViewProps = {
  token: string;
  url: string;
  /** Label for the other participant's tile. */
  peerLabel: string;
  onLeave: () => void;
};
