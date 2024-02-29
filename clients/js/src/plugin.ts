import { getTensorMarginProgram } from './generated';

export const tensorMargin = () => ({
  install() {
    getTensorMarginProgram();
  },
});
