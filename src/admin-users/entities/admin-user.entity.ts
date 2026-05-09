import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('usersAdmin')
export class AdminUser {

    @ApiProperty({
        description: 'ID único do usuário (UUID)',
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({
        description: 'Nome do usuário',
        example: 'Rafael Santos'
    })
    @Column()
    name: string;

    @ApiProperty({
        description: 'Email do usuário',
        example: 'example@example.com'
    })
    @Column({ unique: true })
    email: string;

    @ApiProperty({
        description: 'Senha do usuário (armazenada como hash)',
        example: 'hashed_password_example'
    })
    @Column({ select: false })
    password: string;

    @ApiProperty({
        description: 'Função do usuário (ex: admin, editor, viewer)',
        example: 'admin'
    })
    @Column()
    role: string;

    @ApiProperty({
        description: 'Indica se o usuário está ativo',
        example: true
    })
    @Column({ default: true })
    isActive: boolean;

    @ApiProperty({
        description: 'Data de criação do registro'
    })
    @CreateDateColumn()
    createdAt: Date;

    @ApiProperty({
        description: 'Data da última atualização'
    })
    @UpdateDateColumn()
    updatedAt: Date;

}
