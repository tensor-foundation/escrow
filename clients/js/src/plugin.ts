import { getTensorEscrowProgram } from './generated';

export const tensorEscrow = () => ({
  install() {
    getTensorEscrowProgram();
  },
});
