import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Simulación temporal de una base de datos
const users = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, firstName, lastName } = body;

    // Validación básica
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Verificar si el usuario ya existe
    if (users.has(email)) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Crear nuevo usuario
    const userId = crypto.randomBytes(16).toString('hex');
    const user = {
      id: userId,
      email,
      firstName: firstName || '',
      lastName: lastName || '',
      createdAt: new Date()
    };

    // Almacenar usuario
    users.set(email, user);

    // Generar token
    const token = generateToken();

    // Crear wallet simulada
    const wallet = {
      address: `vx${crypto.randomBytes(20).toString('hex')}`,
      balance: '0'
    };

    console.log('User registered successfully:', {
      email,
      hasWallet: true,
      userId
    });

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        },
        wallet
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
