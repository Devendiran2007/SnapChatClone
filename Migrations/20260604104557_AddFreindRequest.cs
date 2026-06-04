using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SnapChat_Clone.Migrations
{
    /// <inheritdoc />
    public partial class AddFreindRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsAccepted",
                table: "FriendRequests");

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "FriendRequests",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Status",
                table: "FriendRequests");

            migrationBuilder.AddColumn<bool>(
                name: "IsAccepted",
                table: "FriendRequests",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }
    }
}
