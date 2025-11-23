
import { Point } from '../types';

export const getDistance = (p1: Point, p2: Point): number => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const normalizeAngle = (angle: number): number => {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
};

export const lerpAngle = (start: number, end: number, t: number): number => {
  const diff = normalizeAngle(end - start);
  return normalizeAngle(start + diff * t);
};

export const lerp = (start: number, end: number, t: number): number => {
  return start * (1 - t) + end * t;
};

export const getRandomPoint = (mapSize: number): Point => {
  return {
    x: Math.random() * mapSize,
    y: Math.random() * mapSize,
  };
};

export const uuid = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
