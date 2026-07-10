import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import {
  YoactivMembersBrowser,
  type YoactivMembersApi,
} from "@/components/YoactivMembersBrowser";

const api: YoactivMembersApi = {
  branches: adminApi.yoactiv.branches,
  members: adminApi.yoactiv.members,
  memberDetail: adminApi.yoactiv.memberDetail,
};

export default function AdminYoactivMembers() {
  return (
    <AdminLayout title="Gym Members (YoActiv)">
      <AdminCard className="p-6">
        <YoactivMembersBrowser
          api={api}
          emptyBranchesMessage="No YoActiv branches configured. Map gyms to their YoActiv Branch ID in Gym Management first."
        />
      </AdminCard>
    </AdminLayout>
  );
}
