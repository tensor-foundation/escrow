import { getMarginProgram } from './generated';

export const margin = () => ({
  install() {
    getMarginProgram();
  },
});
