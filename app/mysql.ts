import mysql, { Connection, RowDataPacket } from "mysql2/promise";

export class MySQLDatabase {
  private connection!: Connection;

  private config: {
    host: string;
    user: string;
    password: string;
    database: string;
  } = {
    host: process.env.mysql_host as string,
    user: process.env.mysql_user as string,
    password: process.env.mysql_password as string,
    database: process.env.mysql_database as string,
  };

  async connect(): Promise<void> {
    this.connection = await mysql.createConnection(this.config);
  }

  async disconnect(): Promise<void> {
    await this.connection.end();
  }
  /**
   * 查找用户
   * @param openid
   * @returns
   */
  async getDataByOpenid(openid: string): Promise<RowDataPacket | null> {
    const [rows] = await this.connection.execute<RowDataPacket[]>(
      "SELECT * FROM wx_public_user WHERE openid = ?",
      [openid],
    );
    return rows.length > 0 ? rows[0] : null;
  }
  /**
   * 更新用户 时间
   * @param openid
   */
  async updateUpdateTime(openid: string): Promise<void> {
    await this.connection.execute(
      "UPDATE wx_public_user SET update_time = NOW() WHERE openid = ?",
      [openid],
    );
  }
}
