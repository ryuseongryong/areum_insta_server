import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Unique,
  JoinColumn,
} from 'typeorm/index';

@Entity()
export class Users {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  visitors: number;

  @Column()
  counter: number;
}
