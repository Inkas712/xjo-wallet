import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import Colors from '@/constants/colors';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

function generateQRMatrix(data: string): boolean[][] {
  const size = 21;
  const matrix: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));
  
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 7; j++) {
      const isPattern = i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4);
      matrix[i][j] = isPattern;
      matrix[i][size - 1 - j] = isPattern;
      matrix[size - 1 - i][j] = isPattern;
    }
  }
  
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }
  
  let dataIndex = 0;
  const dataHash = data.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let row = 0; row < size; row++) {
      for (let c = 0; c < 2; c++) {
        const x = col - c;
        const y = row;
        if (!isReserved(x, y, size)) {
          matrix[y][x] = ((dataHash + dataIndex) * 7) % 3 === 0;
          dataIndex++;
        }
      }
    }
  }
  
  return matrix;
}

function isReserved(x: number, y: number, size: number): boolean {
  if (x < 8 && y < 8) return true;
  if (x < 8 && y >= size - 8) return true;
  if (x >= size - 8 && y < 8) return true;
  if (x === 6 || y === 6) return true;
  return false;
}

export default function QRCodeDisplay({ value, size = 180 }: QRCodeDisplayProps) {
  const matrix = generateQRMatrix(value);
  const cellSize = size / matrix.length;
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Rect x={0} y={0} width={size} height={size} fill={Colors.light.white} />
        {matrix.map((row, rowIndex) =>
          row.map((cell, colIndex) =>
            cell ? (
              <Rect
                key={`${rowIndex}-${colIndex}`}
                x={colIndex * cellSize}
                y={rowIndex * cellSize}
                width={cellSize}
                height={cellSize}
                fill={Colors.light.primaryDark}
              />
            ) : null
          )
        )}
      </Svg>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>XJO</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    position: 'absolute',
    backgroundColor: Colors.light.white,
    padding: 8,
    borderRadius: 8,
  },
  logoText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.light.primaryDark,
    letterSpacing: 1,
  },
});
