import { Direction } from '../resizer';

export default (dir: Direction, target: string): boolean => new RegExp(dir, 'i').test(target);
